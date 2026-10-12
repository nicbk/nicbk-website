/**
 * Scrolls `list` so `item` is in its view — **the list only**.
 *
 * `scrollIntoView` would do this and also scroll every scrollable ancestor to
 * match: the sheet, and on a phone the page under it. A list marking where the
 * reader is must not move anything but itself, so its own `scrollTop` is set.
 *
 * `nearest` moves the least that shows the item, and nothing if it is already
 * shown; `center` puts it in the middle.
 */
export function keepInView(
  list: HTMLElement,
  item: HTMLElement,
  block: 'nearest' | 'center',
): void {
  const listBox = list.getBoundingClientRect()
  const itemBox = item.getBoundingClientRect()
  const top = itemBox.top - listBox.top + list.scrollTop
  const bottom = top + itemBox.height

  if (block === 'center') {
    list.scrollTop = top - (list.clientHeight - itemBox.height) / 2
    return
  }
  if (top < list.scrollTop) {
    list.scrollTop = top
  } else if (bottom > list.scrollTop + list.clientHeight) {
    list.scrollTop = bottom - list.clientHeight
  }
}
