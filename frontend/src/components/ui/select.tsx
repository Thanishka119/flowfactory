import * as React from 'react';

type SelectContextValue = {
  value?: string;
  setValue: (value: string) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  disabled: boolean;
  options: Map<string, React.ReactNode>;
  registerOption: (value: string, label: React.ReactNode) => void;
  unregisterOption: (value: string) => void;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const context = React.useContext(SelectContext);

  if (!context) {
    throw new Error('Select components must be used inside Select');
  }

  return context;
}

type SelectProps = React.PropsWithChildren<{
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}>;

export function Select({
  value: controlledValue,
  defaultValue,
  onValueChange,
  disabled = false,
  children,
}: SelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  const [, setOptionsVersion] = React.useState(0);
  const optionsRef = React.useRef(new Map<string, React.ReactNode>());

  const value = controlledValue ?? internalValue;

  const setValue = React.useCallback(
    (newValue: string) => {
      setInternalValue(newValue);
      onValueChange?.(newValue);
      setOpen(false);
    },
    [onValueChange],
  );

  const registerOption = React.useCallback(
    (optionValue: string, label: React.ReactNode) => {
      if (!optionsRef.current.has(optionValue)) {
        optionsRef.current.set(optionValue, label);
        setOptionsVersion((version) => version + 1);
      }
    },
    [],
  );

  const unregisterOption = React.useCallback((optionValue: string) => {
    optionsRef.current.delete(optionValue);
    setOptionsVersion((version) => version + 1);
  }, []);

  return (
    <SelectContext.Provider
      value={{
        value,
        setValue,
        open,
        setOpen,
        disabled,
        options: optionsRef.current,
        registerOption,
        unregisterOption,
      }}
    >
      <div className="relative w-full">{children}</div>
    </SelectContext.Provider>
  );
}

type SelectTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen, disabled } = useSelectContext();

    return (
      <button
        ref={ref}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled || props.disabled}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ${className ?? ''}`}
        {...props}
      >
        {children}
        <span className="ml-2">▾</span>
      </button>
    );
  },
);
SelectTrigger.displayName = 'SelectTrigger';

export function SelectValue({
  placeholder = 'Select...',
}: {
  placeholder?: string;
}) {
  const { value, options } = useSelectContext();

  return (
    <span className="truncate">
      {value ? options.get(value) ?? value : placeholder}
    </span>
  );
}

type SelectContentProps = React.HTMLAttributes<HTMLDivElement>;

export const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => {
    const { open } = useSelectContext();

    return (
      <div
        ref={ref}
        hidden={!open}
        role="listbox"
        className={`absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg ${className ?? ''}`}
        {...props}
      >
        {children}
      </div>
    );
  },
);
SelectContent.displayName = 'SelectContent';

type SelectItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

export const SelectItem = React.forwardRef<HTMLButtonElement, SelectItemProps>(
  ({ value, className, children, disabled, ...props }, ref) => {
    const { setValue, registerOption, unregisterOption } = useSelectContext();

    React.useEffect(() => {
      registerOption(value, children);

      return () => unregisterOption(value);
    }, [value, children, registerOption, unregisterOption]);

    return (
      <button
        ref={ref}
        type="button"
        role="option"
        disabled={disabled}
        onClick={() => setValue(value)}
        className={`block w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ''}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);
SelectItem.displayName = 'SelectItem';
