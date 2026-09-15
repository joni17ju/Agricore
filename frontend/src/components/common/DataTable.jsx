import { useEffect, useMemo, useState } from 'react';
import { IconButton } from './Button.jsx';

/**
 * Responsive table. On small screens rows become stacked cards; each cell shows
 * its column header as a label (via data-label).
 *
 * @param {{ key: string, header: string, render?: (row) => node, className?: string, hideOnMobile?: boolean }[]} columns
 */
export default function DataTable({
  columns,
  rows,
  getRowKey,
  emptyMessage = 'No records found.',
  pageSize,
  rowClassName,
  onRowClick,
  selectable = false,
  selectedKeys,
  onSelectionChange,
}) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(pageSize ?? rows.length);
  const totalPages = pageSize ? Math.max(1, Math.ceil(rows.length / perPage)) : 1;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const visibleRows = useMemo(
    () => (pageSize ? rows.slice((page - 1) * perPage, page * perPage) : rows),
    [rows, page, perPage, pageSize],
  );

  const allVisibleSelected = selectable && visibleRows.length > 0 && visibleRows.every((row) => selectedKeys?.has(getRowKey(row)));
  const toggleAll = () => {
    const next = new Set(selectedKeys);
    visibleRows.forEach((row) => (allVisibleSelected ? next.delete(getRowKey(row)) : next.add(getRowKey(row))));
    onSelectionChange(next);
  };
  const toggleRow = (key) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };

  return (
    <div className="data-table">
      <div className="data-table__scroll">
        <table>
          <thead>
            <tr>
              {selectable && (
                <th className="data-table__check">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all rows" />
                </th>
              )}
              {columns.map((column) => (
                <th key={column.key} className={column.className}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="data-table__empty">{emptyMessage}</td>
              </tr>
            )}
            {visibleRows.map((row, index) => {
              const key = getRowKey(row);
              return (
                <tr
                  key={key}
                  className={`anim-fade-up ${onRowClick ? 'is-clickable' : ''} ${rowClassName?.(row) ?? ''}`}
                  style={{ '--i': Math.min(index, 10) }}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {selectable && (
                    <td className="data-table__check" onClick={(event) => event.stopPropagation()}>
                      <input type="checkbox" checked={selectedKeys?.has(key) ?? false} onChange={() => toggleRow(key)} aria-label="Select row" />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      data-label={column.header}
                      className={`${column.className ?? ''} ${column.hideOnMobile ? 'hide-mobile' : ''} ${column.primary ? 'is-primary' : ''}`}
                    >
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pageSize && rows.length > 0 && (
        <div className="pagination">
          <span className="text-muted text-sm">
            {(page - 1) * perPage + 1}–{Math.min(page * perPage, rows.length)} of {rows.length}
          </span>
          <div className="pagination__pages">
            <IconButton icon="chevron-left" label="Previous page" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1} />
            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .filter((number) => Math.abs(number - page) <= 2 || number === 1 || number === totalPages)
              .map((number) => (
                <button
                  key={number}
                  type="button"
                  className={`pagination__page ${number === page ? 'is-active' : ''}`}
                  onClick={() => setPage(number)}
                  aria-current={number === page ? 'page' : undefined}
                >
                  {number}
                </button>
              ))}
            <IconButton icon="chevron-right" label="Next page" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} />
          </div>
          <select
            className="pagination__size"
            value={perPage}
            onChange={(event) => {
              setPerPage(Number(event.target.value));
              setPage(1);
            }}
            aria-label="Rows per page"
          >
            {[5, 10, 20].map((size) => (
              <option key={size} value={size}>{size} / page</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
