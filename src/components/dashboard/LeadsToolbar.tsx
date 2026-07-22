"use client";

import {
  ChevronDown,
  Download,
  Filter,
  Plus,
  Settings2,
  ArrowUpDown,
} from "lucide-react";
import { Breadcrumbs, Button, SearchField } from "@heroui/react";
import { ThemeControls } from "@/components/ThemeControls";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  showThemeControls?: boolean;
};

export function LeadsToolbar({
  search,
  onSearchChange,
  showThemeControls = false,
}: Props) {
  return (
    <div className="shrink-0 space-y-3 border-b border-dash-line bg-dash-surface px-3 pt-3 pb-3 sm:space-y-4 sm:px-5 sm:pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Breadcrumbs className="shrink-0" aria-label="Breadcrumb">
          <Breadcrumbs.Item href="#">
            Leads
            <ChevronDown className="ml-1 size-3.5 opacity-60" aria-hidden />
          </Breadcrumbs.Item>
          <Breadcrumbs.Item href="#">
            All Leads
            <ChevronDown className="ml-1 size-3.5 opacity-60" aria-hidden />
          </Breadcrumbs.Item>
        </Breadcrumbs>

        <SearchField
          fullWidth
          value={search}
          onChange={onSearchChange}
          aria-label="Search leads"
          className="w-full min-w-0 flex-1 sm:mx-auto sm:max-w-md"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search...." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="hidden sm:inline-flex"
          >
            Save as Smartboard
          </Button>
          <Button isIconOnly variant="secondary" size="sm" aria-label="Download">
            <Download className="size-4" />
          </Button>
          <Button variant="primary" size="sm" className="flex-1 sm:flex-initial">
            <Plus className="size-4" aria-hidden />
            Create Lead
          </Button>
          {showThemeControls ? (
            <div className="hidden md:block">
              <ThemeControls compact />
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm">
            <ArrowUpDown className="size-3.5" aria-hidden />
            Sort
          </Button>
          <Button variant="ghost" size="sm">
            <Filter className="size-3.5" aria-hidden />
            Filter
          </Button>
        </div>
        <Button variant="ghost" size="sm">
          <Settings2 className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">View Settings</span>
          <span className="sm:hidden">View</span>
        </Button>
      </div>
    </div>
  );
}
