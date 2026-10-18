# Editing the website

Website content lives in four Markdown files inside `content/`:

- `bio.md` controls the introduction beside the profile picture.
- `research_interests.md` controls the collapsible research section.
- `papers.md` controls the publication list.
- `find_me_online.md` controls the social and contact links.

## Edit locally

After editing a Markdown file, run:

```sh
npm install
npm run build
```

Open `index.html` to review the generated page. Commit the Markdown files and generated `index.html` together.

## Edit on GitHub

You can edit any file in `content/` directly on GitHub and commit it to `main`. The “Build and deploy website” workflow rebuilds and publishes the site automatically.

## Markdown conventions

The bio and research files accept ordinary Markdown, including paragraphs, emphasis, links, and lists.

In `papers.md`, start each paper with a level-two or deeper heading. Make the heading a link to show the “View” action. Add `Year:` and `Authors:` lines below it; bold labels are optional.

```md
## [Paper title](https://example.com/paper)

**Year:** 2026
**Authors:** A. Author, B. Author
```

In `find_me_online.md`, use a Markdown bullet list. Each item contains a link followed by optional display text. `-`, `*`, and `+` bullets are supported.

```md
- [Service](https://example.com/profile) — @username
```

Substack, Google Scholar, Bluesky, GitHub, and email links automatically receive their matching icon. Other services receive a generic link icon.

The visual design remains in `site.template.html`. Normally, content-only changes should not require editing that file.
