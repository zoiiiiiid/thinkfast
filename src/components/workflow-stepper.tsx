type StepperProps = {
  steps: string[];
  current: number;
};

export function WorkflowStepper({ steps, current }: StepperProps) {
  return (
    <ol className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
      {steps.map((step, index) => {
        const isActive = index === current;
        const isDone = index < current;
        return (
          <li
            key={step}
            className={`rounded-lg border px-3 py-2 text-xs ${isActive ? "border-primary bg-primary/10" : ""} ${
              isDone ? "border-emerald-300 bg-emerald-500/10" : ""
            }`}
          >
            <span className="mr-1 font-semibold">{index + 1}.</span>
            {step}
          </li>
        );
      })}
    </ol>
  );
}
