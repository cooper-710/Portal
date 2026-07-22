import * as React from "react";

import { nativeSelectClassName } from "@/lib/form-controls";

function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={nativeSelectClassName(className)}
      {...props}
    >
      {children}
    </select>
  );
}

export { NativeSelect };
