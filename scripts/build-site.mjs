import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import MarkdownIt from "markdown-it";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const escapeAttribute = (value) => value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const markdown = new MarkdownIt({
    html: false,
    linkify: false,
    typographer: true
});

const defaultLinkOpen = markdown.renderer.rules.link_open
    || ((tokens, index, options, env, self) => self.renderToken(tokens, index, options));

markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const href = tokens[index].attrGet("href") || "";
    if (/^https?:\/\//i.test(href)) {
        tokens[index].attrSet("target", "_blank");
        tokens[index].attrSet("rel", "noopener noreferrer");
    }
    return defaultLinkOpen(tokens, index, options, env, self);
};

function renderMarkdown(file) {
    return markdown.render(read(file).trim()).trim();
}

function extractField(body, field) {
    const expression = new RegExp(
        `^\\s*(?:\\*\\*|__)?${field}\\s*:\\s*(?:\\*\\*|__)?\\s*(.+?)\\s*$`,
        "im"
    );
    return body.match(expression)?.[1]?.replace(/\s{2,}$/, "").trim() || "";
}

function renderPapers(file) {
    const source = read(file).trim();
    const headings = [...source.matchAll(/^#{2,6}\s+(.+?)\s*$/gm)];

    if (!headings.length) {
        return `<li class="paper-fallback markdown-content">${markdown.render(source)}</li>`;
    }

    return headings.map((heading, index) => {
        const rawHeading = heading[1].trim();
        const bodyStart = heading.index + heading[0].length;
        const bodyEnd = headings[index + 1]?.index ?? source.length;
        const body = source.slice(bodyStart, bodyEnd).trim();
        const linkedTitle = rawHeading.match(/^\[([^\]]+)]\(([^)]+)\)$/);
        const title = linkedTitle?.[1] || rawHeading;
        const url = linkedTitle?.[2] || extractField(body, "Link");
        const year = extractField(body, "Year") || "—";
        const authors = extractField(body, "Authors");
        const safeUrl = escapeAttribute(url);
        const viewLink = url
            ? `<a class="paper-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escapeAttribute(title)} in a new tab">View ↗</a>`
            : "";

        return `
                    <li class="paper">
                        <span class="paper-year">${markdown.renderInline(year)}</span>
                        <div>
                            <span class="paper-title">${markdown.renderInline(title)}</span>
                            ${authors ? `<span class="paper-authors">${markdown.renderInline(authors)}</span>` : ""}
                        </div>
                        ${viewLink}
                    </li>`;
    }).join("");
}

function platformIcon(label, url) {
    const value = `${label} ${url}`.toLowerCase();
    if (value.includes("substack")) {
        return '<span class="substack-dot" aria-hidden="true">S</span>';
    }
    if (value.includes("scholar.google")) {
        return '<img src="imgs/google-scholar.ico" alt="">';
    }
    if (value.includes("bsky") || value.includes("bluesky")) {
        return '<img src="imgs/bsky.png" alt="">';
    }
    if (value.includes("github")) {
        return '<img src="imgs/githubicon.png" alt="">';
    }
    if (value.includes("mailto:") || value.includes("email")) {
        return '<span class="mail-icon" aria-hidden="true">✉</span>';
    }
    return '<span class="generic-link-icon" aria-hidden="true">↗</span>';
}

function renderFindMe(file) {
    const source = read(file).trim();
    const items = [];
    const linePattern = /^\s*[-*+]\s+\[([^\]]+)]\(([^)]+)\)\s*(?:[—–-]|:)?\s*(.*?)\s*$/gm;

    for (const match of source.matchAll(linePattern)) {
        const [, label, url, meta] = match;
        const external = /^https?:\/\//i.test(url);
        const attributes = external ? ' target="_blank" rel="noopener noreferrer"' : "";
        const cue = external ? ' <span class="arrow" aria-hidden="true">↗</span>' : "";
        const aria = external ? `, opens in a new tab` : "";
        items.push(`
                    <a class="destination" href="${escapeAttribute(url)}"${attributes} aria-label="${escapeAttribute(label)}${aria}">
                        ${platformIcon(label, url)}
                        <span class="destination-name">${markdown.renderInline(label)}</span>
                        <span><span class="destination-meta">${markdown.renderInline(meta)}</span>${cue}</span>
                    </a>`);
    }

    if (!items.length) {
        return `<div class="markdown-content">${markdown.render(source)}</div>`;
    }
    return items.join("");
}

const replacements = {
    "{{BIO_HTML}}": renderMarkdown("content/bio.md"),
    "{{RESEARCH_HTML}}": renderMarkdown("content/research_interests.md"),
    "{{PAPERS_HTML}}": renderPapers("content/papers.md"),
    "{{FIND_ME_HTML}}": renderFindMe("content/find_me_online.md")
};

let output = read("site.template.html");
for (const [placeholder, value] of Object.entries(replacements)) {
    if (!output.includes(placeholder)) {
        throw new Error(`Missing template placeholder: ${placeholder}`);
    }
    output = output.replace(placeholder, value);
}
output = output.replace(
    "<!doctype html>",
    "<!doctype html>\n<!-- Generated from content/*.md. Run npm run build after editing Markdown. -->"
);

const indexPath = path.join(root, "index.html");
if (process.argv.includes("--check")) {
    const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : "";
    if (current !== output) {
        console.error("index.html is out of date. Run: npm run build");
        process.exit(1);
    }
    console.log("Generated site is up to date.");
    process.exit(0);
}

fs.writeFileSync(indexPath, output);

const dist = path.join(root, "dist");
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.cpSync(path.join(root, "imgs"), path.join(dist, "imgs"), { recursive: true });
fs.writeFileSync(path.join(dist, "index.html"), output);
fs.writeFileSync(path.join(dist, ".nojekyll"), "");

console.log("Built index.html and dist/ from Markdown content.");
