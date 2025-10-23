var urlAll = '<all_urls>';
var searchUrlWord = '';
var searchTitleWord = '';

var validURLs = [
  urlAll
];
// Get the template element
const template = document.getElementById('li_template');

// Filter tabs that meet the conditions
function filterTabs(tabs, searchUrlWord, searchTitleWord) {
  return tabs.filter(tab => {
    return tab.url.includes(searchUrlWord) && new RegExp(searchTitleWord).test(tab.title);
  });
}

// Create elements based on the filtered results
function createElements(filteredTabs, template) {

  const elements = new Set();
  for (const tab of filteredTabs) {
    const element = template.content.firstElementChild.cloneNode(true);
    const title = tab.title;
    const pathname = tab.url;
    element.querySelector('.title').textContent = title;
    element.querySelector('.pathname').textContent = pathname;
    element.querySelector('a').addEventListener('click', async () => {
      // Need to focus the window as well as the active tab
      await chrome.tabs.update(tab.id, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
    });

    element.querySelector('button').addEventListener('click', () => {
      // Remove the redundant 'async'
      chrome.tabs.remove(tab.id, () => { });
    });

    element.dataset.id = tab.id;
    elements.add(element);
  }
  return elements;
}

async function refreshExt() {
  // Query tab information again and update the 'tabs' variable
  const filteredTabs = await queryAndFilterTabs(searchUrlWord, searchTitleWord);

  // Create elements based on the filtered results
  const elements = createElements(filteredTabs, template);

  document.querySelector('ul').innerHTML = '';
  document.querySelector('ul').append(...elements);
  updateGetSearchHistory();
}
refreshExt();

const button = document.getElementById('group_all');
button.addEventListener('click', async () => {
  // Record the current search keywords to the local storage search ordered list
  await new Promise((resolve) => {
    if (searchUrlWord === '' && searchTitleWord === '') {
      resolve();
      return;
    }
    chrome.storage.local.get('searchHistory', function (result) {
      const searchHistory = result.searchHistory || [];
      console.log("searchHistory", searchHistory);

      // Limit the length of the search history to 10. If it exceeds, delete the oldest search keyword
      addItemToSearchHistory(searchHistory, {
        url: searchUrlWord,
        title: searchTitleWord,
        action: 'group'
      }, resolve);
    });
  });

  var tabIds = [];
  document.querySelector('ul').querySelectorAll('li').forEach(element => {
    tabIds.push(parseInt(element.dataset.id, 10));
  });
  console.log(tabIds);
  const group = await chrome.tabs.group({ tabIds });
  await chrome.tabGroups.update(group, { title: searchUrlWord ? searchUrlWord : (searchTitleWord ? searchTitleWord : "Docs") });
  await refreshExt();
});

const c_button = document.getElementById('close_all');
c_button.addEventListener('click', async () => {
  // Record the current search keywords to the local storage search ordered list
  await new Promise((resolve) => {
    if (searchUrlWord === '' && searchTitleWord === '') {
      resolve();
      return;
    }

    chrome.storage.local.get('searchHistory', function (result) {
      const searchHistory = result.searchHistory || [];
      console.log("searchHistory", searchHistory);

      // Limit the length of the search history to 10. If it exceeds, delete the oldest search keyword
      addItemToSearchHistory(searchHistory, {
        url: searchUrlWord,
        title: searchTitleWord,
        action: 'close'
      }, resolve);
    });
  });

  const queryItemList = document.querySelector('ul');
  const removePromises = [];
  queryItemList.querySelectorAll('li').forEach(element => {
    const removePromise = new Promise((resolve) => {
      chrome.tabs.remove(parseInt(element.dataset.id, 10), () => {
        queryItemList.removeChild(element);
        resolve();
      });
    });
    removePromises.push(removePromise);
  });

  // Wait for all tab closing operations to complete
  await Promise.all(removePromises);

  // Call the refreshExt function to update the list
  await refreshExt();
});

const d_button = document.getElementById('discard_all');
d_button.addEventListener('click', async () => {
  // Record the current search keywords to the local storage search ordered list
  await new Promise((resolve) => {
    if (searchUrlWord === '' && searchTitleWord === '') {
      resolve();
      return;
    }

    chrome.storage.local.get('searchHistory', function (result) {
      const searchHistory = result.searchHistory || [];
      console.log("searchHistory", searchHistory);

      // Limit the length of the search history to 10. If it exceeds, delete the oldest search keyword
      addItemToSearchHistory(searchHistory, {
        url: searchUrlWord,
        title: searchTitleWord,
        action: 'discard'
      }, resolve);
    });
  });

  const queryItems = document.querySelector('ul');
  queryItems.querySelectorAll('li').forEach(element => {
    chrome.tabs.discard(parseInt(element.dataset.id, 10), () => { });
    // queryItems.removeChild(element);
  });

  await refreshExt(); // Also need to refresh the list
});

const sU = document.getElementById('searchUrl');
sU.addEventListener("keyup", function (event) {
  searchUrlWord = event.target.value;
  refreshExt();
});

const sT = document.getElementById('searchTitle');
sT.addEventListener("keyup", function (event) {
  searchTitleWord = event.target.value;
  refreshExt();
});

async function queryAndFilterTabs(searchUrlWord, searchTitleWord) {
  let tabs = await chrome.tabs.query({ url: validURLs });
  const collator = new Intl.Collator();
  tabs.sort((a, b) => collator.compare(a.url, b.url));
  // Filter tabs
  const filteredTabs = filterTabs(tabs, searchUrlWord, searchTitleWord);
  return filteredTabs;
}

function addItemToSearchHistory(searchHistory, newItem, resolve) {
  // Check if the same search keyword already exists in the search history
  const existingItem = searchHistory.find(item => item.url === newItem.url && item.title === newItem.title && item.action === newItem.action);
  if (existingItem) {
    // If the same search keyword already exists, remove it from the search history
    searchHistory.splice(searchHistory.indexOf(existingItem), 1);
  }

  // Limit the length of the search history to 100. If it exceeds, delete the oldest search keyword
  while (searchHistory.length >= 100) {
    searchHistory.pop();
  }

  // Add the new search keyword to the beginning of the search history
  searchHistory.unshift(newItem);

  chrome.storage.local.set({ searchHistory: searchHistory }, () => {
    resolve();
  });
}

function updateGetSearchHistory() {
  chrome.storage.local.get('searchHistory', function (result) {
    const list = document.querySelector('ol');
    // Clear the list
    list.innerHTML = '';

    const searchHistory = result.searchHistory || [];
    console.log("searchHistory", searchHistory);

    // Only display the latest 10 historical records
    const recentHistory = searchHistory.slice(0, 10);

    // Add historical items in the order of the recentHistory array
    recentHistory.forEach(item => {
      const newItem = document.createElement('li');
      newItem.textContent = item.title + ' ' + item.url;

      // Create an execution button
      const executeButton = document.createElement('button');
      executeButton.classList.add('execute-button');
      executeButton.textContent = 'Execute ' + translateAction(item.action);
      executeButton.addEventListener('click', async () => {
        try {
          if (item.action === 'close') {
            const tabs = await queryAndFilterTabs(item.url, item.title);
            for (let i = 0; i < tabs.length; i++) {
              await chrome.tabs.remove(tabs[i].id);
            }
          } else if (item.action === 'discard') {
            const tabs = await queryAndFilterTabs(item.url, item.title);
            for (let i = 0; i < tabs.length; i++) {
              await chrome.tabs.discard(tabs[i].id);
            }
          } else if (item.action === 'group') {
            const tabs = await queryAndFilterTabs(item.url, item.title);
            const tabIds = tabs.map(tab => tab.id);
            const group = await chrome.tabs.group({ tabIds });
            await chrome.tabGroups.update(group, { title: item.url ? item.url : (item.title ? item.title : "Docs") });
          }
          await refreshExt();
        } catch (error) {
          console.error('Error executing the operation:', error);
        }
      });

      // Add the button to the list item
      newItem.appendChild(executeButton);

      newItem.addEventListener('click', async function (event) {
        if (event.target.matches('.execute-button')) {
          // The button click event is handled above
          return;
        }
        // Handle other click events
        // Write the corresponding content to the text boxes 'searchUrl' and 'searchTitle'
        const searchUrlInput = document.getElementById('searchUrl');
        const searchTitleInput = document.getElementById('searchTitle');
        searchUrlInput.value = item.url;
        searchTitleInput.value = item.title;
        searchUrlWord = item.url;
        searchTitleWord = item.title;
        refreshExt();
      });

      list.appendChild(newItem);
    });
  });
}

// 新增重复标签整理功能
document.getElementById('deduplicate').addEventListener('click', async () => {
  const allTabs = await chrome.tabs.query({});
  const urlCountMap = new Map();

  // 统计title出现次数
  allTabs.forEach(tab => {
    urlCountMap.set(tab.title, (urlCountMap.get(tab.title) || 0) + 1);
  });
  const dupTitle = new Map();
  // 过滤需要关闭的重复标签
  const tabsToClose = allTabs.filter(tab => {
    if (urlCountMap.get(tab.title) > 1 && !tab.active) {
      dupTitle.set(tab.title, 1);
      return true;
    }
    return false;
  });

  // 按照打开时间排序
  tabsToClose.sort((a, b) => a.index - b.index);

  // 关闭重复标签（保留最近激活的）
  await Promise.all(tabsToClose.map(tab => {
    urlCountMap.set(tab.title, urlCountMap.get(tab.title) - 1)
    if (urlCountMap.get(tab.title) >= 1) {
      chrome.tabs.remove(tab.id)
      console.log(`已关闭重复标签：${tab.title}`);
    }
  }
  ));

  // 记录操作历史
  await new Promise(resolve => {
    chrome.storage.local.get('searchHistory', result => {
      const searchHistory = result.searchHistory || [];
      if (dupTitle.size > 0) {
        addItemToSearchHistory(searchHistory, {
          action: 'deduplicate',
          url: Array.from(dupTitle.keys()).join('\n'),
          title: `已清理${dupTitle.size}个重复标签`
        }, resolve);
      } else {
        addItemToSearchHistory(searchHistory, {
          action: 'deduplicate',
          url: '清理',
          title: `未发现重复标签`
        }, resolve);
      }
    });
  });

  refreshExt();
});

// 更新操作类型翻译
function translateAction(action) {
  if (action === 'close') {
    return 'Close ❌';
  } else if (action === 'discard') {
    return 'Discard 🗑️';
  } else if (action === 'group') {
    return 'Group 🗂️';
  } else if (action === 'deduplicate') {
    return '整理重复标签 🔄';
  }
}

// Get the 'clear' button element
const clearSearchUrlButton = document.getElementById('clearSearchUrl');
// Add a click event listener to the 'clear' button
clearSearchUrlButton.addEventListener('click', function () {
  const searchUrlInput = document.getElementById('searchUrl');
  const searchTitleInput = document.getElementById('searchTitle');

  // Clear the input box content
  searchUrlInput.value = '';
  searchTitleInput.value = '';
  // Clear the 'searchUrlWord' variable
  searchUrlWord = '';
  searchTitleWord = '';
  // Refresh the extension to update the tab display
  refreshExt();
});

// newItem.textContent = 'Search History 1';
// const list = document.querySelector('ol');
// list.appendChild(newItem);
// list.appendChild(newItem.cloneNode(true));
// list.appendChild(newItem.cloneNode(true));
// list.appendChild(newItem.cloneNode(true));
// list.appendChild(newItem.cloneNode(true));

// Get the export button element
const exportButton = document.getElementById('exportHistory');
// Add a click event listener to the export button
exportButton.addEventListener('click', async () => {
  try {
    // Get the search history from local storage
    const result = await new Promise((resolve) => {
      chrome.storage.local.get('searchHistory', function (result) {
        resolve(result);
      });
    });
    const searchHistory = result.searchHistory || [];

    // Convert the search history to a JSON string
    const jsonData = JSON.stringify(searchHistory, null, 2);

    // Create a Blob object to store the JSON data
    const blob = new Blob([jsonData], { type: 'application/json' });

    // Create a download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'search_history.json';

    // Simulate a click on the download link
    a.click();

    // Release the URL object
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting search history:', error);
  }
});