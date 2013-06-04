chrome.contextMenus.create({
    "title": "View cookies",
    "contexts": ["page"],
    "onclick": function(info, tab) {
        chrome.tabs.create({"url": chrome.extension.getURL("options.html")});
    }
});
