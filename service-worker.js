
chrome.commands.onCommand.addListener((command) => {
  console.log(`Command: ${command}`);

  if (command === 'new-tab') {
    function getCurrentTab(callback) {
      let queryOptions = { active: true, lastFocusedWindow: true };
      chrome.tabs.query(queryOptions, ([tab]) => {
        if (chrome.runtime.lastError)
          console.error(chrome.runtime.lastError);
        // `tab` will either be a `tabs.Tab` instance or `undefined`.
        callback(tab);
      });
    }

    function createTab(tab) {
      chrome.tabs.create(
        { url: 'edge://newtab', 'openerTabId': tab.id, 'index': tab.index + 1 },
        (tabc) => {
          if (tab.groupId != undefined){
            chrome.tabs.group({
              'groupId': tab.groupId,
              'tabIds': [tabc.id]
            }, (groupId) => {
              // console.log("groupId", groupId)
            })
          }
        }
      );
    }

    getCurrentTab(createTab)
  }

});
