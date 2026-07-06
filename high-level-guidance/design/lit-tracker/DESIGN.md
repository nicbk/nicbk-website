# Academic Literature Tracker

This academic literature tracker is used to keep track of my progress
in reading academic literature, and also serve as a place to store, view,
and markup this academic literature.

Here are features of the academic literature tracker:

## Features

* User simply uploads an article (e.g. PDF) and then the app automatically
  extracts relevant information (e.g. name, abstract, authors, bibliography)
  to add to the user's collection.
* User can set read status for an article (e.g. `pending`, `reading`, `read`)
* Bibliography information is automatically linked to form a graph which
  can be traversed via the UI.
  That is, given an article, the user can do the following:
    a. View what articles from the bibliography are also in the user's
       collection (and then navigate to those referenced articles in such a way
       where the user can navigate back as well)
    b. View what other articles in the user's collection cite the article that
       is currently being viewed. (The user can similarly also navigate to these
       other articles)
    c. The user can view what articles from the bibliography have not yet been
       added to their collection
* The user can view the article through a built-in reader interface which allows
  the user to also markup the document with annotations (these annotations
  get persisted)
* The entire UI/UX is natively reactive, as per the overall site constraints.
  Thus, any features we previously mentioned that includes some shared,
  persisted backend data that is surfaced in the UI, is also live updated
  across all live clients.
