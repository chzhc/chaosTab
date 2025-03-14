var urlAll = '<all_urls>';
var searchUrlWord = '';
var searchTitleWord = '';

var validURLs = [
  urlAll
];

// // 初始获取一次标签页信息
// let tabs = await chrome.tabs.query({
//   url: validURLs
// });
// // 排序collator用于字符串比较排序
// const collator = new Intl.Collator();
// tabs.sort((a, b) => collator.compare(a.url, b.url));

const template = document.getElementById('li_template');

// 过滤符合条件的标签页
function filterTabs(tabs, searchUrlWord, searchTitleWord) {
  return tabs.filter(tab => {
    return tab.url.includes(searchUrlWord) && new RegExp(searchTitleWord).test(tab.title);
  });
}

// 根据过滤结果创建元素
function createElements(filteredTabs, template) {

  const elements = new Set();
  for (const tab of filteredTabs) {
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

    element.querySelector('button').addEventListener('click', () => {
      // 去掉多余的 async
      chrome.tabs.remove(tab.id, () => { });
    });

    element.dataset.id = tab.id;
    elements.add(element);
  }
  return elements;
}

async function refreshExt() {
  // 重新查询标签页信息并更新 tabs 变量
  const filteredTabs = await queryAndFilterTabs(searchUrlWord, searchTitleWord);

  // 根据过滤结果创建元素
  const elements = createElements(filteredTabs, template);

  document.querySelector('ul').innerHTML = '';
  document.querySelector('ul').append(...elements);
  updateGetSearchHistory();
}
refreshExt();

const button = document.getElementById('group_all');
button.addEventListener('click', async () => {
  // 记录当前搜索关键词到本地存储搜索有序列表
  await new Promise((resolve) => {
    if (searchUrlWord === '' && searchTitleWord === '') {
      resolve();
      return;
    }
    chrome.storage.local.get('searchHistory', function (result) {
      const searchHistory = result.searchHistory || [];
      console.log("searchHistory", searchHistory);

      // 限制搜索历史的长度为10，如果超过长度，则删除最旧的搜索关键词
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
  await chrome.tabGroups.update(group, { title: searchUrlWord ? searchUrlWord : "Docs" });
  await refreshExt();
});

const c_button = document.getElementById('close_all');
c_button.addEventListener('click', async () => {
  // 记录当前搜索关键词到本地存储搜索有序列表
  await new Promise((resolve) => {
    if (searchUrlWord === '' && searchTitleWord === '') {
      resolve();
      return;
    }

    chrome.storage.local.get('searchHistory', function (result) {
      const searchHistory = result.searchHistory || [];
      console.log("searchHistory", searchHistory);

      // 限制搜索历史的长度为10，如果超过长度，则删除最旧的搜索关键词
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

  // 等待所有标签页关闭操作完成
  await Promise.all(removePromises);

  // 调用 refreshExt 函数来更新列表
  await refreshExt();
});

const d_button = document.getElementById('discard_all');
d_button.addEventListener('click', async () => {
  // 记录当前搜索关键词到本地存储搜索有序列表
  await new Promise((resolve) => {
    if (searchUrlWord === '' && searchTitleWord === '') {
      resolve();
      return;
    }

    chrome.storage.local.get('searchHistory', function (result) {
      const searchHistory = result.searchHistory || [];
      console.log("searchHistory", searchHistory);

      // 限制搜索历史的长度为10，如果超过长度，则删除最旧的搜索关键词
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

  await refreshExt(); // 也需要刷新列表
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
  // 过滤标签页
  const filteredTabs = filterTabs(tabs, searchUrlWord, searchTitleWord);
  return filteredTabs;
}

function addItemToSearchHistory(searchHistory, newItem, resolve) {
  // 检查搜索历史中是否已经存在相同的搜索关键词
  const existingItem = searchHistory.find(item => item.url === newItem.url && item.title === newItem.title && item.action === newItem.action);
  if (existingItem) {
    // 如果已经存在相同的搜索关键词，则将其从搜索历史中删除
    searchHistory.splice(searchHistory.indexOf(existingItem), 1);
  }

  // 限制搜索历史的长度为100，如果超过长度，则删除最旧的搜索关键词
  while (searchHistory.length >= 100) {
    searchHistory.pop();
  }

  // 将新的搜索关键词添加到搜索历史的开头
  searchHistory.unshift(newItem);

  chrome.storage.local.set({ searchHistory: searchHistory }, () => {
    resolve();
  });
}

function updateGetSearchHistory() {
  chrome.storage.local.get('searchHistory', function (result) {
    const list = document.querySelector('ol');
    // 清空列表
    list.innerHTML = '';

    const searchHistory = result.searchHistory || [];
    console.log("searchHistory", searchHistory);

    // 仅展示最近的10个历史记录
    const recentHistory = searchHistory.slice(0, 10);

    // 按照 recentHistory 数组的顺序添加历史项
    recentHistory.forEach(item => {
      const newItem = document.createElement('li');
      newItem.textContent = item.title + ' ' + item.url;

      // 创建执行按钮
      const executeButton = document.createElement('button');
      executeButton.classList.add('execute-button');
      executeButton.textContent = '执行' + translateAction(item.action);
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
            await chrome.tabGroups.update(group, { title: item.url ? item.url : "Docs" });
          }
          await refreshExt();
        } catch (error) {
          console.error('执行操作时出错:', error);
        }
      });

      // 将按钮添加到列表项中
      newItem.appendChild(executeButton);

      newItem.addEventListener('click', async function (event) {
        if (event.target.matches('.execute-button')) {
          // 按钮点击事件已在上面处理
          return;
        }
        // 处理其他点击事件
        // 将对应的内容写到文本框 searchUrl 以及 searchTitle 中
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

function translateAction(action) {
  if (action === 'close') {
    return '关闭❌';
  } else if (action === 'discard') {
    return '丢弃🗑️';
  } else if (action === 'group') {
    return '分组🗂️';
  }
}

// 获取 clear 按钮元素
const clearSearchUrlButton = document.getElementById('clearSearchUrl');
// 为 clear 按钮添加点击事件监听器
clearSearchUrlButton.addEventListener('click', function () {
  const searchUrlInput = document.getElementById('searchUrl');
  const searchTitleInput = document.getElementById('searchTitle');

  // 清空输入框内容
  searchUrlInput.value = '';
  searchTitleInput.value = '';
  // 清空 searchUrlWord 变量
  searchUrlWord = '';
  searchTitleWord = '';
  // 刷新扩展以更新标签页显示
  refreshExt();
});

// newItem.textContent = '搜索历史1';
// const list = document.querySelector('ol');
// list.appendChild(newItem);
// list.appendChild(newItem.cloneNode(true));
// list.appendChild(newItem.cloneNode(true));
// list.appendChild(newItem.cloneNode(true));
// list.appendChild(newItem.cloneNode(true));

// 获取导出按钮元素
const exportButton = document.getElementById('exportHistory');
// 为导出按钮添加点击事件监听器
exportButton.addEventListener('click', async () => {
  try {
    // 获取本地存储中的搜索历史
    const result = await new Promise((resolve) => {
      chrome.storage.local.get('searchHistory', function (result) {
        resolve(result);
      });
    });
    const searchHistory = result.searchHistory || [];

    // 将搜索历史转换为 JSON 字符串
    const jsonData = JSON.stringify(searchHistory, null, 2);

    // 创建一个 Blob 对象来存储 JSON 数据
    const blob = new Blob([jsonData], { type: 'application/json' });

    // 创建一个下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'search_history.json';

    // 模拟点击下载链接
    a.click();

    // 释放 URL 对象
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出搜索历史时出错:', error);
  }
});