import { type Table } from "@tanstack/react-table";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { forwardRef, useState, useMemo } from "react";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { ButtonProps } from "@calcom/ui";
import {
  Button,
  buttonClasses,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  Icon,
} from "@calcom/ui";

interface ColumnVisiblityProps<TData> {
  table: Table<TData>;
}

function ColumnVisibilityButtonComponent<TData>(
  {
    children,
    color = "secondary",
    EndIcon = "sliders-vertical",
    table,
    ...rest
  }: ColumnVisiblityProps<TData> & ButtonProps,
  ref: React.Ref<HTMLButtonElement>
) {
  const { t } = useLocale();
  const allColumns = table.getAllLeafColumns();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button ref={ref} color={color} EndIcon={EndIcon} {...rest} className="border-subtle h-8 rounded-md">
          {children ? children : t("View")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("search")} />
          <CommandList>
            <CommandEmpty>{t("no_columns_found")}</CommandEmpty>
            <CommandGroup heading={t("toggle_columns")}>
              {allColumns.map((column) => {
                const canHide = column.getCanHide();
                if (!column.columnDef.header || typeof column.columnDef.header !== "string" || !canHide)
                  return null;
                const isVisible = column.getIsVisible();
                return (
                  <CommandItem key={column.id} onSelect={() => column.toggleVisibility(!isVisible)}>
                    <div
                      className={classNames(
                        "border-subtle mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                        isVisible ? "text-emphasis" : "opacity-50 [&_svg]:invisible"
                      )}>
                      <Icon name="check" className={classNames("h-4 w-4")} />
                    </div>
                    {column.columnDef.header}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => allColumns.forEach((column) => column.toggleVisibility(true))}
                className={classNames(
                  "w-full justify-center text-center",
                  buttonClasses({ color: "secondary" })
                )}>
                {t("show_all_columns")}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const ColumnVisibilityButton = forwardRef(ColumnVisibilityButtonComponent) as <TData>(
  props: ColumnVisiblityProps<TData> & ButtonProps & { ref?: React.Ref<HTMLButtonElement> }
) => ReturnType<typeof ColumnVisibilityButtonComponent>;

// Filters

interface FilterButtonProps<TData> {
  table: Table<TData>;
}

function FilterButtonComponent<TData>(
  { table }: FilterButtonProps<TData>,
  ref: React.Ref<HTMLButtonElement>
) {
  const { t } = useLocale();
  const [activeFilters, setActiveFilters] = useQueryState<string[]>("activeFilters", {
    defaultValue: [],
    parse: parseAsArrayOf(parseAsString),
  });
  const columns = table.getAllColumns().filter((column) => column.getCanFilter());

  const filterableColumns = useMemo(() => {
    return columns.map((column) => ({
      id: column.id,
      title: typeof column.columnDef.header === "string" ? column.columnDef.header : column.id,
      options: column.getFacetedUniqueValues(),
    }));
  }, [columns]);

  const handleAddFilter = (columnId: string) => {
    if (!activeFilters.includes(columnId)) {
      setActiveFilters([...activeFilters, columnId]);
    }
  };

  const handleRemoveFilter = (columnId: string) => {
    setActiveFilters(activeFilters.filter((id) => id !== columnId));
    table.getColumn(columnId)?.setFilterValue(undefined);
  };

  return (
    <div className="flex items-center space-x-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button ref={ref} color="secondary" className="h-8 border-dashed">
            <Icon name="filter" className="mr-2 h-4 w-4" />
            {t("add_filter")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t("search_columns")} />
            <CommandList>
              <CommandEmpty>{t("no_columns_found")}</CommandEmpty>
              {filterableColumns.map((column) => (
                <CommandItem key={column.id} onSelect={() => handleAddFilter(column.id)}>
                  {column.title}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {activeFilters.map((columnId) => {
        const column = filterableColumns.find((col) => col.id === columnId);
        if (!column) return null;
        return (
          <Popover key={columnId}>
            <PopoverTrigger asChild>
              <Button color="secondary" className="h-8">
                {column.title}
                <Icon name="chevron-down" className="ml-2 h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder={t("search_options")} />
                <CommandList>
                  <CommandEmpty>{t("no_options_found")}</CommandEmpty>
                  {Array.from(column.options).map(([option]) => (
                    <CommandItem
                      key={option}
                      onSelect={() => {
                        const filterValue = table.getColumn(columnId)?.getFilterValue() as
                          | string[]
                          | undefined;
                        const newFilterValue = filterValue?.includes(option)
                          ? filterValue.filter((value) => value !== option)
                          : [...(filterValue || []), option];
                        table
                          .getColumn(columnId)
                          ?.setFilterValue(newFilterValue.length ? newFilterValue : undefined);
                      }}>
                      <div
                        className={classNames(
                          "border-subtle mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                          Array.isArray(table.getColumn(columnId)?.getFilterValue()) &&
                            (table.getColumn(columnId)?.getFilterValue() as string[])?.includes(option)
                            ? "bg-primary"
                            : "opacity-50"
                        )}>
                        {Array.isArray(table.getColumn(columnId)?.getFilterValue()) &&
                          (table.getColumn(columnId)?.getFilterValue() as string[])?.includes(option) && (
                            <Icon name="check" className="text-primary-foreground h-4 w-4" />
                          )}
                      </div>
                      {option}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
              <Button
                color="destructive"
                className="mt-2 w-full"
                onClick={() => handleRemoveFilter(columnId)}>
                {t("remove_filter")}
              </Button>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}

const FilterButton = forwardRef(FilterButtonComponent) as <TData>(
  props: FilterButtonProps<TData> & { ref?: React.Ref<HTMLButtonElement> }
) => ReturnType<typeof FilterButtonComponent>;

export { ColumnVisibilityButton, FilterButton };
