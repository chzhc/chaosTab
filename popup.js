// Copyright 2022 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var urlAll = '<all_urls>'
var searchWord = ''

var validURLs = [
  // 'https://developer.chrome.com/docs/webstore/*',
  // 'https://developer.chrome.com/docs/extensions/*',
  urlAll
]
var tabs = await chrome.tabs.query({
  url: validURLs
});
async function updateTabs() {
  tabs = await chrome.tabs.query({
    url: validURLs
  });
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator
const collator = new Intl.Collator();
// tabs.sort((a, b) => collator.compare(a.title, b.title));
tabs.sort((a, b) => collator.compare(a.url, b.url));

const template = document.getElementById('li_template');
function refreshExt() {

  document.querySelector('ul').innerHTML = ''
  // console.log("tabs",tabs)

  const elements = new Set();
  for (const tab of tabs) {
    console.log("result", tab.url.includes(searchWord))
    if (searchWord && !tab.url.includes(searchWord)) {
      continue
    }

    const element = template.content.firstElementChild.cloneNode(true);

    // const title = tab.title.split('-')[0].trim();
    const title = tab.title
    // const pathname = new URL(tab.url).pathname.slice('/docs'.length);
    const pathname = tab.url
    element.querySelector('.title').textContent = title;
    element.querySelector('.pathname').textContent = pathname;
    element.querySelector('a').addEventListener('click', async () => {
      // need to focus window as well as the active tab
      await chrome.tabs.update(tab.id, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });

      await updateTabs()
    });
    element.querySelector('button').addEventListener('click', async () => {
      await chrome.tabs.remove(tab.id, () => { });

      try {
        const result = await updateTabs(); // 等待异步函数的结果
        if (result) {
          // 执行同步函数
          refreshExt()
        }
      } catch (error) {
        // 处理异步函数的错误
      }
    })

    element.dataset.id = tab.id
    elements.add(element);
  }
  document.querySelector('ul').append(...elements);
}
refreshExt()

const button = document.getElementById('group_all');
button.addEventListener('click', async () => {
  var tabIds = []
  document.querySelector('ul').querySelectorAll('li').forEach(element => {
    tabIds.push(parseInt(element.dataset.id, 10))
  });
  console.log(tabIds)
  // const tabIds = tabs.map(({ id }) => id);
  const group = await chrome.tabs.group({ tabIds });
  await chrome.tabGroups.update(group, { title: searchWord ? searchWord : "Docs" });

  await updateTabs()
});

const c_button = document.getElementById('close_all');
c_button.addEventListener('click', async () => {
  const ul = document.querySelector('ul')
  ul.querySelectorAll('li').forEach(element => {
    chrome.tabs.remove(parseInt(element.dataset.id, 10), async () => {})
    ul.removeChild(element);
  });
});

const d_button = document.getElementById('discard_all');
d_button.addEventListener('click', async () => {
  const ul = document.querySelector('ul')
  ul.querySelectorAll('li').forEach(element => {
    chrome.tabs.discard(parseInt(element.dataset.id, 10), async () => {})
    ul.removeChild(element);
  });
});

const c = document.getElementById('search');
c.addEventListener("keypress", function (event) {
  if (event.keyCode === 13) {
    searchWord = event.target.value
    // alert("你输入的内容是：" + searchWord);
    refreshExt()
  }
})

c.addEventListener("blur", function (event) {
  searchWord = event.target.value
  refreshExt()
})
