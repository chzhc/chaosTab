var urlAll = '<all_urls>';
var searchUrlWord = '';
var searchTitleWord = '';

var validURLs = [
  urlAll
];

chrome.action;

async function updateTabs() {
  tabs = await chrome.tabs.query({
    url: validURLs
  });
}

// 初始获取一次标签页信息
let tabs = await chrome.tabs.query({
  url: validURLs
});

// 排序collator用于字符串比较排序
const collator = new Intl.Collator();
tabs.sort((a, b) => collator.compare(a.url, b.url));

const template = document.getElementById('li_template');

function refreshExt() {
  document.querySelector('ul').innerHTML = '';

  const elements = new Set();
  for (const tab of tabs) {
    if (tab.url.includes(searchUrlWord) && new RegExp(searchTitleWord).test(tab.title)) {
      const element = template.content.firstElementChild.cloneNode(true);
      const title = tab.title;
      const pathname = tab.url;
      element.querySelector('.title').textContent = title;
      element.querySelector('.pathname').textContent = pathname;
      element.querySelector('a').addEventListener('click', async () => {
        // need to focus window as well as the active tab
        await chrome.tabs.update(tab.id, { active: true });
        await chrome.windows.update(tab.windowId, { focused: true });
      });

      element.querySelector('button').addEventListener('click', async () => {
        await chrome.tabs.remove(tab.id, () => { });
      });

      element.dataset.id = tab.id;
      elements.add(element);
    }

    document.querySelector('ul').append(...elements);
  }
}
refreshExt();

const button = document.getElementById('group_all');
button.addEventListener('click', async () => {
  var tabIds = [];
  document.querySelector('ul').querySelectorAll('li').forEach(element => {
    tabIds.push(parseInt(element.dataset.id, 10));
  });
  console.log(tabIds);
  const group = await chrome.tabs.group({ tabIds });
  await chrome.tabGroups.update(group, { title: searchUrlWord ? searchUrlWord : "Docs" });
});

const c_button = document.getElementById('close_all');
c_button.addEventListener('click', async () => {
  // 记录当前搜索关键词到本地存储搜索有序列表
  chrome.storage.local.get('searchHistory', function (result) {
    // 如果本地存储中没有搜索历史，则创建一个空数组
    const searchHistory = result.searchHistory || [];
    // 打印
    console.log("searchHistory", searchHistory);

    // 检查搜索历史中是否已经存在相同的搜索关键词
    const existingItem = searchHistory.find(item => item.url === searchUrlWord && item.title === searchTitleWord);
    if (existingItem) {
      // 如果已经存在相同的搜索关键词，则将其从搜索历史中删除
      searchHistory.splice(searchHistory.indexOf(existingItem), 1);
    }

    // 将新的搜索关键词添加到搜索历史的开头
    const newItem = {
      url: searchUrlWord,
      title: searchTitleWord,
      action: 'close'
    };

    // 限制搜索历史的长度为10，如果超过长度，则删除最旧的搜索关键词
    while (searchHistory.length >= 10) {
      searchHistory.shift();
    }
    searchHistory.push(newItem);

    chrome.storage.local.set({ searchHistory: searchHistory });
  });

  const queryItemList = document.querySelector('ul');
  queryItemList.querySelectorAll('li').forEach(element => {
    chrome.tabs.remove(parseInt(element.dataset.id, 10), async () => { });
    queryItemList.removeChild(element);
  });
});

const d_button = document.getElementById('discard_all');
d_button.addEventListener('click', async () => {
  const queryItems = document.querySelector('ul');
  queryItems.querySelectorAll('li').forEach(element => {
    chrome.tabs.discard(parseInt(element.dataset.id, 10), async () => { });
    queryItems.removeChild(element);
  });
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

// 读取本地存储的历史项展示为表格

// const newItem = document.createElement('li');
const list = document.querySelector('ol');

chrome.storage.local.get('searchHistory', function (result) {
  // 如果本地存储中没有搜索历史，则创建一个空数组
  const searchHistory = result.searchHistory || [];
  // 打印
  console.log("searchHistory", searchHistory);
  // 遍历搜索历史数组，并将每个搜索关键词添加到列表中
  for (let i = 0; i < searchHistory.length; i++) {
    const item = searchHistory[i];
    // 创建一个新的列表项
    const newItem = document.createElement('li');
    newItem.textContent = item.url + ' ' + item.title + ' ' + translateAction(item.action);

    // 绑定点击事件，点击执行对应action的行为
    newItem.addEventListener('click', async () => {
      // 应用搜索词
      searchUrlWord = item.url;
      searchTitleWord = item.title;
      refreshExt();
      // dry run
      return;

      // 执行对应action的行为
      if (item.action === 'close') {
        await chrome.tabs.query({ url: item.url }, function (tabs) {
          for (let i = 0; i < tabs.length; i++) {
            chrome.tabs.remove(tabs[i].id);
          }
        });
      } else if (item.action === 'discard') {
        await chrome.tabs.query({ url: item.url }, function (tabs) {
          for (let i = 0; i < tabs.length; i++) {
            chrome.tabs.discard(tabs[i].id);
          }
        });
      } else if (item.action === 'group') {
        await chrome.tabs.query({ url: item.url }, function (tabs) {
          const tabIds = tabs.map(tab => tab.id);
          chrome.tabs.group({ tabIds });
        });
      }
    });
    // 将新的搜索关键词添加到列表中
    list.appendChild(newItem);
  }
})

function translateAction(action) {
  if (action === 'close') {
    return '关闭❌';
  } else if (action === 'discard') {
    return '丢弃🗑️';
  } else if (action === 'group') {
    return '分组🗂️';
  }
}

// newItem.textContent = '搜索历史1';
// const list = document.querySelector('ol');
// list.appendChild(newItem);
// list.appendChild(newItem.cloneNode(true));
// list.appendChild(newItem.cloneNode(true));
// list.appendChild(newItem.cloneNode(true));
// list.appendChild(newItem.cloneNode(true));