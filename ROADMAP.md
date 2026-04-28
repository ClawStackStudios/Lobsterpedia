# Lobsterpedia©™ Roadmap

## Phase 1: Foundation (Current)
- [x] Project Initialization
- [x] CrustAgent©™ Protocol Setup
- [x] Basic UI Scaffolding
- [x] Express Backend Implementation
- [x] Local File System Mock/Ref (Real FS Integrated)

## Phase 2: Ingestion
- [x] PDF/DOCX Parsing Logic
- [x] LLM Synthesis Engine (OpenRouter)
- [x] Markdown Generation Protocol

## Phase 3: Synthesis & Maintenance
- [x] Cross-referencing Logic
- [x] Linting pass for Context Rot
- [x] Graph View Implementation

## Phase 4: Next Phase to implement

In the ArticleView component, enhance the article content rendering to automatically detect and convert internal wiki links (e.g., [[page-id]] or [Page Title](page-id)) into clickable links that navigate to the corresponding article using the `onNavigate` function. Highlight the text of the linked page's title in the hover preview tooltip.

Refactor the link rendering logic within the ArticleView component into a reusable `WikiLink` component. This component should handle displaying the link, managing hover states, showing previews, and navigating to other articles, abstracting away the logic for better maintainability and reusability.

- [x] In the ArticleView component, when a user hovers over a semantic cross-reference link within the article content, highlight all other nodes and links in the GraphView that are connected to the hovered node. Ensure this highlighting is visually distinct and adheres to the existing design system.

- [x] In the ArticleView component, develop a preview of the document when the mouse hovers over a node in the graph view. Enhance visual feedback by displaying a preview of the document when the user's mouse is hovering over a node.

cross off the entry in the roadmap when complete

## Phase 5: Extra Awesomeness Features to implement
**ALWAYS** cross off finished features after implementing.

- [x] Develop the health lint checks to be connected to the Shipyard Maintenance tab, so the lint checks send the genuine issues they find into the Shipyard Maintenance tab, and the tab is checking genuine errors and lints in the wiki.
Not 2 separate systems. One symbiotic system.

- [x] Develop dynamic detection for yaml frontmatter and develop an element to display it if any is detected in markdown files. Design the element to be consistent visually with the citeation display element.

- [ ] In the SearchResults component, add a filter option that allows users to filter search results by document type (e.g., concept, system, entity). This filter should be accessible alongside existing filters for tags and author.

- [x] In the ArticleView component, when a user hovers over a semantic cross-reference link within the article content, highlight all other nodes and links in the GraphView that are connected to the hovered node. Ensure this highlighting is visually distinct and adheres to the existing design system.

- [ ] Implement a backend API endpoint and frontend button within the ArticleView component that triggers an automated 'fix' action for detected lint issues on the current article. This should use the LLM to analyze the issue and propose a correction.

- [ ] In the ArticleView component, when an LLM generates content (e.g., summary, or potentially in future edits), ensure that it includes citations to the source documents or other wiki pages used. Display these citations clearly, perhaps as a list at the end of the generated content.

[DONE] - Implement a dark mode toggle in the Header component. When activated, it should switch the application's theme to a dark variant, adjusting background and text colors accordingly. Persist the theme preference in local storage.

In the IngestZone component, when a file is uploaded or dropped, display a visual progress indicator (e.g., a progress bar) showing the upload and parsing status. Update the indicator dynamically based on the API response.

Add a UI element in the MaintenanceZone that allows users to view their configured LLM API keys (e.g., OPENROUTER_API_KEY, GEMINI_API_KEY). The keys should be masked by default and revealed upon clicking a button.

In the ArticleView component, allow users to add and manage external URLs in addition to internal wiki links.

[DONE] - Develop a 'Linting' feature within the React app. This feature should allow the user to initiate a process where the LLM analyzes the existing markdown files for logical inconsistencies, broken internal links, and orphaned pages. The results should be displayed to the user, perhaps in the 'Lint Logs' view.

[DONE] - Implement a file watcher in the React/Vite application that monitors the local '/wiki' directory. When a markdown file changes, trigger a state update in the application to re-render the relevant article or update the index.

Create a Node.js API endpoint that accepts file content and metadata, interacts with an LLM to generate markdown, and saves the output to the local file system. This API should be callable from the React frontend.

[DONE] - In the ArticleView component, add a 'Lint Health Check' button that triggers an API call to the '/api/wiki/lint' endpoint, displaying the report below the button.

[DONE] - Implement a search bar in the Header component that allows users to search across all wiki pages (title, content, tags). Display results in a new SearchResults component.

[DONE] - Add a button to the IngestZone component to allow users to upload files (PDF, DOCX, TXT, MD) directly, which will then be parsed and their text content extracted.

Add a notification system to alert users about changes to articles they follow or new content relevant to their interests.

Implement user roles and permissions to control access and editing rights for different sections of the wiki.

[DONE] - Enhance the search functionality with advanced filters, such as by date, author, and tag, to refine search results.

In the SearchResults component, when displaying search results, highlight the specific terms within the article titles and content snippets that matched the user's query. This will make it easier for users to quickly identify why a particular result was returned.

In the SearchResults component, add a filter option for author. This should allow users to select an author from a list of authors present in the current search results and filter the results accordingly.

---

[DONE] - Implement drag and drop functionality for reorganizing files and folders within the wiki directory.
[DONE] - Add functionality to rename files and folders within the wiki directory via context menu.

# COLLABORATION

Enable collaborative editing features for wiki articles, allowing multiple users to contribute and edit simultaneously.

In the ArticleView component, add functionality to assign articles to specific users or agents, and display this assignment information clearly within the article view.

---

[DONE] - Add a feature to commit changes to the git repository from the UI. This should include a form for the commit message and a button to lock the claw.

Implement an auto-save feature for the IngestZone. Drafts of the source title and raw text should be saved to local storage and restored on page load or refresh.

[DONE] - Implement PDF and DOCX parsing for document ingestion using the mammoth and pdf-parse libraries. This should allow users to upload these file types in the IngestZone.

[DONE] - Integrate the GraphView component into the main App.tsx file, making it accessible via navigation. This will allow users to visualize the semantic connections between wiki articles.

Enhance the search results page to include highlighting of the search query within the content snippets. Also, add a 'clear search' button.

[DONE] - Implement an editing mode for the ArticleView component that allows users to modify the content of existing wiki articles.

[DONE] - Add a feature to delete wiki articles from the system, including updating the graph and index accordingly.

Enhance the GraphView component to allow users to pan and zoom the graph smoothly using mouse gestures.

[DONE] - Allow users to add, remove, and edit tags for wiki articles directly from the ArticleView.

[DONE] - In the ArticleView component, when a user hovers over a semantic cross-reference link (e.g., 'linkedPage.md'), display a small tooltip or popover showing the title and a brief snippet of the content of that linked article. This will provide users with a quick preview without navigating away.

In the ArticleView component, display the author of the last modification below the article title and above the content. This information should be retrieved from the article's metadata and displayed alongside the 'Last Synced' information.

In the ArticleView component, add a 'Delete Article' button. When clicked, this button should trigger a confirmation dialog asking the user if they are sure they want to delete the article. If confirmed, make an API call to delete the article and then navigate the user back to the Wiki Index.

In the ArticleView component's editing mode, implement validation for the title and content fields. Ensure that the title is not empty and that the content is not just whitespace. Display clear error messages to the user if validation fails, and prevent the 'Save' button from being activated until the fields are valid.

Add visual loading indicators to all buttons and actions within the ArticleView component that trigger asynchronous operations (e.g., Save, Delete, Lint Health Check). This will improve the user experience by providing immediate feedback during processing.

[DONE] - Enhance the ArticleView component to include a 'Version History' tab or section. This section should display previous versions of the article, allowing users to view or revert to older states. Leverage the existing Git integration for this.

In the WikiIndex component, add functionality to filter the list of articles by their tags. This should be implemented as clickable tag elements that, when selected, only display articles associated with that tag.

[DONE] - In the ArticleView component, implement functionality that highlights all semantic cross-references when a user hovers over a specific link within the article content. Ensure this highlighting is visually distinct and clearly indicates the connected articles.

[DONE] - In the ArticleView component, add a button that, when clicked, sends the article's content to the LLM via the /api/wiki/synthesize endpoint to generate a concise summary. Display this summary above the main article content.

In IngestZone.tsx, allow users to select from predefined markdown templates (e.g., 'Research Paper', 'Meeting Notes', 'Tool Documentation') before they start typing or uploading files. Pre-fill the content area with the selected template.

[DONE] - In ArticleView.tsx, when hovering over a linked article in the 'Semantic Cross-References' section, display a small tooltip or modal showing a preview of that article's title and a brief snippet of its content.

In GitHistory.tsx, add a 'Staged Changes' section that lists all .md files modified since the last commit. Implement a button to 'Stage All' and update the commit form to only commit staged files.

Enhance the search functionality in SearchResults.tsx to prioritize exact title matches and then use fuzzy matching for content and tag searches. Consider implementing a scoring mechanism for relevance.

In the ArticleView component, add a dropdown or radio button group to allow users to select and change the 'type' of an article (e.g., 'concept', 'system', 'tool', 'event'). Update the save API to persist this change.

On the ArticleView, add a sidebar that dynamically lists articles linked from the current article.

Enhance the link resolution in the ArticleView component to handle cases where a linked article ID might not exist and provide a user-friendly message or a quick way to create it.

When a user searches within the app and lands on an article, highlight the search terms within the article content.

In the ArticleView component, allow users to add and manage external URLs in addition to internal wiki links.

[DONE] - In the SearchResults component, allow users to filter search results by tag and type. When the user applies a filter, update the displayed results accordingly. Add UI elements for tag and type filtering.

In the ArticleView component's editing mode, implement undo/redo functionality for text modifications. Store edit history and provide buttons or keyboard shortcuts to undo and redo changes before saving.

[DONE] - In the GraphView component, when a user clicks on a node that is not the currently active one, animate the graph to focus on the selected node and its direct neighbors, fading out the rest of the graph. Make the active node visually distinct.

In the IngestZone component, after raw text is parsed, use the LLM to automatically suggest relevant tags for the new article based on its content before synthesis. Display these suggested tags to the user for confirmation or modification.

In the SearchResults component, when displaying search results, highlight the specific terms within the article titles and content snippets that matched the user's query. This will make it easier for users to quickly identify why a particular result was returned.

In the GitHistory component, provide more visual feedback after a commit is made. Include a temporary confirmation message indicating success or failure, possibly with an icon (e.g., CheckCircle2 for success, XCircle for failure). Also, disable the commit button while a commit is in progress to prevent duplicate submissions.

In the ArticleView component, when in edit mode, add an input field or a dedicated button that allows the user to add or remove semantic links (PolyPs) to other articles directly. When a link is added, ensure it's reflected in the `links` array and that the corresponding markdown file is updated upon saving.

In the GraphView component, enhance the visual distinction of the active node and its direct neighbors. When a node is focused, use a more prominent color (e.g., a bright accent color like neon green) for the node, its connecting links, and potentially its text label. Fade out or de-emphasize all other nodes and links to clearly highlight the focal point of the graph.

[DONE] - In the ArticleView component, add functionality to generate a concise summary of the current article using the AI service. Display this summary prominently near the top of the article, perhaps in a distinct box, and show a loading indicator while it's being generated. The summary should be a short, professional blurb suitable for an executive overview.

Introduce a feature to assign tasks or articles to specific users or agents within Lobsterpedia, displaying assignment information on the article view.

In the SearchResults component, add options to filter results by tag and document type.

Add a visual progress indicator to the file upload section in the IngestZone component.

[DONE] - When hovering over a linked article ID in ArticleView, show a tooltip preview of the linked article's title and a snippet of its content.

Implement tag autocompletion in the ArticleView's editing mode based on existing tags in the reef.

[DONE] - Enhance the link resolution in the ArticleView component to handle cases where a linked article ID might not exist. If a link points to a non-existent page, display a user-friendly message or a quick 'Create Page' button.

In the ArticleView component, add functionality to assign articles to specific users or agents, and display this assignment information clearly within the article view.

[DONE] - Implement robust academic markdown rendering in the ArticleView component, including full LaTeX support (remark-math, rehype-katex) for displaying complex mathematical formulas and scientific notation.

[DONE] - Upgrade the wiki architecture to follow the Official LLM Wiki patterns (v1 & v2), including incremental synthesis, chronological logging (log.md), content-oriented indexing (index.md), confidence scoring, and supersession tracking.

[DONE] - Develop a dynamic running animation for the Agent Watcher in the footer that shows the agent's current actions (scuttling, indexing, linting, syncing) using motion and emoji assets.

## Tauri App

Set up a Tauri project that includes the existing Vite/React application. Implement a Rust backend that can read from and write to the local file system, and expose these functionalities as API endpoints for the React frontend to consume.

Integrate Tauri into the Vite React application. Configure Tauri to securely access the local file system. Implement the logic for reading, writing, and watching markdown files directly within the Tauri application's backend process, bypassing the need for a separate Node.js API. Ensure the application can handle file operations for PDF and DOCX ingestion.

## Large IDEAS! DO NOT IMPLEMENT WITHOUT USER EXPLICITLY ASKING!

Create a basic Node.js API using Express.js that can receive requests from the React frontend to perform file system operations (read, write, delete markdown files in a specified directory) and interact with an LLM API for content generation or analysis. Define endpoints for common wiki operations like creating a new page, updating an existing one, and triggering an LLM lint pass.

Integrate Git version control into the backend of the application. Ensure that every successful write operation to the wiki directory automatically commits changes to a local Git repository. Implement functionality to view commit history and potentially revert to previous versions through the UI.

Maintained by CrustAgent©™
