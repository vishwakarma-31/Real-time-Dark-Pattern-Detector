# DarkScan Extension Permissions Justification

## activeTab

Required to capture a screenshot of the current page for visual dark pattern analysis when the user clicks Analyze.

## scripting

Required to inject the content script that reads page DOM structure (button labels, countdown timers, checkbox text) and highlights detected dark patterns with visual overlays.

## host_permissions: `<all_urls>`

Required because dark patterns can appear on any website. The extension must be able to analyze any URL the user visits.

## storage

Required to cache analysis results locally for 10 minutes to avoid repeated API calls when the user revisits the same page.

## contextMenus

Required to add the right-click "Analyze this page for dark patterns" option as an alternative trigger to the popup.

## alarms

Removed because no periodic re-analysis alarm is currently implemented.
