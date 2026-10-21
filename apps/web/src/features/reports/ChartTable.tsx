import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface ChartTableColumn {
  label: string;
  numeric?: boolean;
}

interface ChartTableProps {
  caption: string;
  columns: ChartTableColumn[];
  rows: string[][];
}

/** Alternativa acessível aos gráficos: mesmos valores, em tabela. */
export function ChartTable({ caption, columns, rows }: ChartTableProps) {
  return (
    <Table>
      <TableCaption className="mb-2 text-left">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          {columns.map((c) => (
            <TableHead key={c.label} scope="col" className={cn(c.numeric && "text-right")}>
              {c.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={i}>
            {row.map((cell, j) =>
              j === 0 ? (
                <TableHead key={j} scope="row" className="h-auto p-3 font-normal text-text-primary">
                  {cell}
                </TableHead>
              ) : (
                <TableCell key={j} className={cn(columns[j]?.numeric && "num text-right")}>
                  {cell}
                </TableCell>
              ),
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
