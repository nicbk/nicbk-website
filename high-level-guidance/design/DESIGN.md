# Personal Web Site

## What?

This application is a reactive web app.
It is both a personal blog for myself and also contains other
personal web applications in subpages.

## Feel

The overall application is minimalist.
The font is a monospace font to feel techy or coding like.
Specifically, the design should match the images in this folder.
See `home-page.png` for what the home page should look like.
See `about-page.png` for what the about page should look like.
See `blog-page.png` for what the blog page shoud look like.

## Overall Constraints

Every component is open source.
E.g. open source web framework, database, blob store, etc.
The only exception for now can be perhaps the authentication method
    i.e. for authenticating users into the web applications we could use
    something like Google Auth.

Unless explicitly stated otherwise, all the web applications hosted on
this site should share the same infrastructure.
E.g. the same underlying database, sync engine (i.e. if used for reactivity),
blob storage, etc. should be shared across all web applications developed
for this site.

The application is natively reactive.
That is, anywhere there is some shared, UI readable backend data being
persisted, then unless explicitly stated otherwise, when this data is mutated
then the data is live updated across all other live users.
(Thus, we inherently avoid the problem of stale data).

## Specs

* Overall website with the simple home page, about page, and projects page.
* Blog page where users can then read blog posts.
    a. The blogging system can be simple. I'm thinking about simply
       rendering MDX files which can be written and committed directly into
       this project's source code (but structured cleanly under some blog
       subfolder)
* Academic Literature Tracker ![Literature Tracker Link](./lit-tracker/DESIGN.md)
    a. This web app can be accessed under the `projects` page
