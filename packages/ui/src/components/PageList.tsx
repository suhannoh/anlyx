import type { PageStoryboard } from "@anlyx/core";

import { StatusBadge } from "./StatusBadge.js";

type PageListProps = {
  pages: PageStoryboard[];
};

export function PageList({ pages }: PageListProps): JSX.Element {
  return (
    <section className="anlyx-sidebar-section" aria-labelledby="anlyx-pages-heading">
      <div className="anlyx-section-heading" id="anlyx-pages-heading">
        Pages
      </div>
      <ul className="anlyx-list" aria-label="Page list">
        {pages.map((page) => (
          <li className="anlyx-list-item" key={page.id}>
            <div className="anlyx-list-item__line">
              <span className="anlyx-list-item__primary">{page.route}</span>
            </div>
            <div className="anlyx-list-item__meta">
              <StatusBadge tone={page.captureStatus}>{page.captureStatus}</StatusBadge>
              {page.errorMessage ? <span>{page.errorMessage}</span> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
