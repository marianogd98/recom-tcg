import type { Step } from "../../content/how-it-works";
import "./StepList.css";

interface StepListProps {
  steps: readonly Step[];
}

/**
 * Renders any list of steps it is given. It does not know which steps exist:
 * the page passes them in, so the same component can show a different flow.
 */
export function StepList({ steps }: StepListProps) {
  return (
    <ol className="step-list">
      {steps.map((step) => (
        <li key={step.number} className="step-list__item card">
          <span className="step-list__number mono">{step.number}</span>
          <h2 className="step-list__title">{step.title}</h2>
          <p className="step-list__description">{step.description}</p>
        </li>
      ))}
    </ol>
  );
}
