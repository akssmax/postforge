"use client";

import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type FilterFn,
} from "@tanstack/react-table";
import { MoreVertical } from "lucide-react";
import { Button, Checkbox, Pagination } from "@heroui/react";
import { LEADS } from "@/lib/dashboard/leads-data";
import type { Lead } from "@/lib/dashboard/types";
import { InterestChip } from "./InterestChip";
import { SourceChip } from "./SourceChip";
import { LeadsToolbar } from "./LeadsToolbar";

const columnHelper = createColumnHelper<Lead>();

const globalFilterFn: FilterFn<Lead> = (row, _columnId, filterValue) => {
  const q = String(filterValue ?? "")
    .toLowerCase()
    .trim();
  if (!q) return true;
  const { name, email, city, phone, source, interestedIn } = row.original;
  return [name, email, city, phone, source, interestedIn].some((v) =>
    v.toLowerCase().includes(q),
  );
};

function SelectCheckbox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (selected: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <Checkbox
      isSelected={checked}
      onChange={onChange}
      aria-label={ariaLabel}
      variant="secondary"
      className="size-auto"
    >
      <Checkbox.Control className="border border-surface-border bg-dash-surface shadow-none dark:border-white/40 dark:bg-white/8">
        <Checkbox.Indicator />
      </Checkbox.Control>
    </Checkbox>
  );
}

const columns = [
  columnHelper.display({
    id: "select",
    header: ({ table }) => (
      <SelectCheckbox
        checked={table.getIsAllPageRowsSelected()}
        onChange={(selected) => table.toggleAllPageRowsSelected(selected)}
        ariaLabel="Select all"
      />
    ),
    cell: ({ row }) => (
      <SelectCheckbox
        checked={row.getIsSelected()}
        onChange={(selected) => row.toggleSelected(selected)}
        ariaLabel={`Select ${row.original.name}`}
      />
    ),
    size: 40,
  }),
  columnHelper.accessor("name", {
    header: "Lead name",
    cell: ({ getValue }) => (
      <div className="group flex items-center gap-2">
        <span className="font-medium text-text-primary">{getValue()}</span>
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          className="size-7 opacity-0 transition group-hover:opacity-100"
          aria-label="Row actions"
        >
          <MoreVertical className="size-3.5" />
        </Button>
      </div>
    ),
  }),
  columnHelper.accessor("phone", {
    header: "Phone",
    cell: ({ getValue }) => (
      <span className="tabular-nums text-text-secondary">{getValue()}</span>
    ),
  }),
  columnHelper.accessor("email", {
    header: "Email",
    cell: ({ getValue }) => (
      <a
        href={`mailto:${getValue()}`}
        className="inline-flex max-w-[220px] truncate rounded-md border border-accent-sky/25 bg-accent-sky-soft/60 px-2 py-0.5 text-[13px] text-dash-email hover:underline"
      >
        {getValue()}
      </a>
    ),
  }),
  columnHelper.accessor("city", {
    header: "City",
    cell: ({ getValue }) => (
      <span className="text-text-secondary">{getValue()}</span>
    ),
  }),
  columnHelper.accessor("source", {
    header: "Source",
    cell: ({ getValue }) => <SourceChip source={getValue()} />,
  }),
  columnHelper.accessor("interestedIn", {
    header: "Interested in",
    cell: ({ getValue }) => <InterestChip interest={getValue()} />,
  }),
];

export function LeadsTable({
  showThemeControls = false,
}: {
  showThemeControls?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [rowSelection, setRowSelection] = useState({});

  const data = useMemo(() => LEADS, []);

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter: search,
      rowSelection,
    },
    onGlobalFilterChange: setSearch,
    onRowSelectionChange: setRowSelection,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 12, pageIndex: 0 },
    },
    enableRowSelection: true,
  });

  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;

  const pageButtons = useMemo(() => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i);
    }
    const pages: (number | "ellipsis")[] = [0, 1, 2, 3, 4];
    if (pageIndex > 4 && pageIndex < pageCount - 1) {
      return [0, "ellipsis" as const, pageIndex, "ellipsis" as const, pageCount - 1];
    }
    pages.push("ellipsis", pageCount - 1);
    return pages;
  }, [pageCount, pageIndex]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <LeadsToolbar
        search={search}
        onSearchChange={setSearch}
        showThemeControls={showThemeControls}
      />

      <div className="min-h-0 flex-1 overflow-auto px-2 py-2 sm:px-5 sm:py-3">
        <div className="overflow-x-auto overflow-hidden rounded-lg border border-dash-line bg-dash-surface">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm md:min-w-[960px]">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr
                  key={hg.id}
                  className="bg-dash-sidebar dark:bg-white/[0.04]"
                >
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="border-b border-dash-line px-3 py-2.5 text-[10px] font-bold tracking-[0.06em] text-text-secondary uppercase dark:text-text-tertiary"
                      style={{
                        width:
                          header.getSize() !== 150 ? header.getSize() : undefined,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-dash-line last:border-b-0 hover:bg-dash-hover"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-3 py-12 text-center text-sm text-text-tertiary"
                  >
                    No leads match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-t border-dash-line bg-dash-surface px-3 sm:gap-4 sm:px-5">
        <Pagination.Summary className="shrink-0 text-xs text-text-tertiary sm:text-sm">
          <span className="font-medium text-text-primary">{filteredCount}</span>{" "}
          items
        </Pagination.Summary>

        <Pagination size="sm" aria-label="Leads pagination">
          <Pagination.Content>
            <Pagination.Item>
              <Pagination.Previous
                isDisabled={!table.getCanPreviousPage()}
                onPress={() => table.previousPage()}
              >
                <Pagination.PreviousIcon />
              </Pagination.Previous>
            </Pagination.Item>

            {pageButtons.map((p, i) =>
              p === "ellipsis" ? (
                <Pagination.Item key={`e-${i}`}>
                  <Pagination.Ellipsis />
                </Pagination.Item>
              ) : (
                <Pagination.Item key={p}>
                  <Pagination.Link
                    isActive={pageIndex === p}
                    onPress={() => table.setPageIndex(p)}
                  >
                    {p + 1}
                  </Pagination.Link>
                </Pagination.Item>
              ),
            )}

            <Pagination.Item>
              <Pagination.Next
                isDisabled={!table.getCanNextPage()}
                onPress={() => table.nextPage()}
              >
                <Pagination.NextIcon />
              </Pagination.Next>
            </Pagination.Item>
          </Pagination.Content>
        </Pagination>

        <div className="hidden w-20 sm:block" aria-hidden />
      </div>
    </div>
  );
}
