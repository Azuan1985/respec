// @ts-check
// Module core/data-include
// Support for the data-include attribute. Causes external content to be included inside an
// element that has data-include='some URI'. There is also a data-oninclude attribute that
// features a white space separated list of global methods that will be called with the
// module object, the content, and the included URI.
//
// IMPORTANT:
//  This module only really works when you are in an HTTP context, and will most likely
//  fail if you are editing your documents on your local drive. That is due to security
//  restrictions in the browser.
import { pub } from "./pubsubhub.js";
import { runTransforms } from "./utils.js";

export const name = "core/data-include";

function processResponse(rawData, id, url) {
  /** @type {HTMLElement} */
  const el = document.querySelector(`[data-include-id=${id}]`);
  const data = runTransforms(rawData, el.dataset.oninclude, url);
  const replace = typeof el.dataset.includeReplace === "string";
  switch (el.dataset.includeFormat) {
    case "text":
      if (replace) {
        el.replaceWith(data);
      } else {
        el.textContent = data;
      }
      break;
    default:
      // html, which is just using "innerHTML"
      el.innerHTML = data;
      if (replace) {
        el.replaceWith(...el.childNodes);
      }
  }
  // If still in the dom tree, clean up
  if (document.contains(el)) {
    removeIncludeAttributes(el);
  }
}
/**
 * Removes attributes after they are used for inclusion, if present.
 *
 * @param {Element} el The element to clean up.
 */
function removeIncludeAttributes(el) {
  [
    "data-include",
    "data-include-format",
    "data-include-replace",
    "data-include-id",
    "oninclude",
  ].forEach(attr => el.removeAttribute(attr));
}

export async function run() {
  /** @type {NodeListOf<HTMLElement>} */
  const includables = document.querySelectorAll("[data-include]");

  const promisesToInclude = Array.from(includables).map(async el => {
    const url = el.dataset.include;
    if (!url) {
      return; // just skip it
    }
    const id = `include-${String(Math.random()).substr(2)}`;
    el.dataset.includeId = id;
    try {
      const response = await fetch(url);
      const text = await response.text();
      processResponse(text, id, url);
    } catch (err) {
      const msg = `\`data-include\` failed: \`${url}\` (${err.message}). See console for details.`;
      console.error("data-include failed for element: ", el, err);
      pub("error", msg);
    }
  });
  await Promise.all(promisesToInclude);
}
