## 2024-05-24 - Unlabeled Icon-Only Navigation Buttons
**Learning:** Icon-only buttons (like hamburger menus, search icons, theme toggles, and logo buttons) are common in responsive headers but are inaccessible to screen readers without proper ARIA labels. Additionally, toggle buttons controlling expandable elements (like mobile menus) need `aria-expanded` to communicate their state.
**Action:** Always verify that every icon-only `<button>` has an explicitly defined `aria-label`. For buttons that toggle a menu or drawer, always include `aria-expanded={booleanState}`.

## 2024-05-24 - Keyboard Accessibility in Custom Components
**Learning:** Many custom navigation elements built with generic `button` tags or `div`s with `onClick` lack visible focus indicators. Keyboard users must be able to track their position. The utility `focus-visible:ring-2` is extremely effective for adding focus rings without compromising the mouse-click design.
**Action:** Always test components by navigating strictly with the `Tab` key. Ensure every interactive element in a custom component (headers, toolbars, etc.) has a clearly visible focus state using standard utilities like `focus-visible:ring-2`.