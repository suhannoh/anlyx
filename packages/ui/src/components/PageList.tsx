import type { PageStoryboard } from "@anlyx/core";

import { StatusBadge } from "./StatusBadge.js";

type PageListProps = {
  pages: PageStoryboard[];
  selectedPageId: string | undefined;
  onSelectPage: (page: PageStoryboard) => void;
};

export function PageList({ pages, selectedPageId, onSelectPage }: PageListProps): JSX.Element {
  return (
    <section className="anlyx-sidebar-section" aria-labelledby="anlyx-pages-heading">
      <div className="anlyx-section-heading" id="anlyx-pages-heading">
        Frontend Pages
      </div>
      <ul className="anlyx-list" aria-label="Page list">
        {pages.map((page) => (
          <li className="anlyx-list-item" key={page.id}>
            <button
              className="anlyx-page-button"
              type="button"
              aria-current={page.id === selectedPageId ? "true" : undefined}
              aria-label={`${page.route} ${page.captureStatus} ${page.apiCalls.length} API calls ${page.screenshots.length} screenshots`}
              onClick={() => onSelectPage(page)}
            >
              <span className="anlyx-list-item__line">
                <span className="anlyx-list-item__primary">{page.route}</span>
              </span>
              <span className="anlyx-list-item__meta">
                <StatusBadge tone={page.captureStatus}>{page.captureStatus}</StatusBadge>
                <span>{page.apiCalls.length} API calls</span>
                <span>{page.screenshots.length} screenshots</span>
              </span>
              {page.errorMessage ? (
                <span className="anlyx-list-item__meta">{page.errorMessage}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
