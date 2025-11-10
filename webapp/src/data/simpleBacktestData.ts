import strategyOptions from './strategy_options.json';
import legOptions from './leg_options.json';
import strategyParameters from './strategy_parameters.json';
import legParameters from './leg_parameters.json';

export type BacktestOption = {
  value: string;
  label: string;
};

export type StrategyParameter = Record<string, string | number | boolean | null>;
export type LegParameter = Record<string, string | number | boolean | null>;

export const SIMPLE_STRATEGY_OPTIONS = strategyOptions as BacktestOption[];
export const SIMPLE_LEG_OPTIONS = legOptions as BacktestOption[];

export const SIMPLE_STRATEGY_PARAMETERS = strategyParameters as StrategyParameter[];
export const SIMPLE_LEG_PARAMETERS = legParameters as LegParameter[];

// Dynamic strategy options and parameters loaded from JSON
export let DYNAMIC_STRATEGY_OPTIONS: BacktestOption[] = [];
export let DYNAMIC_STRATEGY_PARAMETERS: StrategyParameter[] = [];

// Function to add custom strategy from JSON
export const addCustomStrategy = (option: BacktestOption, parameters: StrategyParameter[]) => {
  // Remove existing custom strategy if it exists
  DYNAMIC_STRATEGY_OPTIONS = DYNAMIC_STRATEGY_OPTIONS.filter(opt => opt.value !== "CUSTOM_STRATEGY");
  DYNAMIC_STRATEGY_PARAMETERS = DYNAMIC_STRATEGY_PARAMETERS.filter(param => param.StrategyName !== "CUSTOM_STRATEGY");

  // Add new custom strategy
  DYNAMIC_STRATEGY_OPTIONS.push(option);

  // Add parameters with proper StrategyName
  const customParameters = parameters.map(param => ({
    ...param,
    StrategyName: "CUSTOM_STRATEGY"
  }));

  DYNAMIC_STRATEGY_PARAMETERS.push(...customParameters);
};

// Function to get all strategy options (static + dynamic)
export const getAllStrategyOptions = (): BacktestOption[] => {
  return [...SIMPLE_STRATEGY_OPTIONS, ...DYNAMIC_STRATEGY_OPTIONS];
};

// Function to get all strategy parameters (static + dynamic)
export const getAllStrategyParameters = (): StrategyParameter[] => {
  return [...SIMPLE_STRATEGY_PARAMETERS, ...DYNAMIC_STRATEGY_PARAMETERS];
};

export const getStrategyParameters = (strategyName: string): StrategyParameter[] => {
  const allParameters = getAllStrategyParameters();
  return allParameters.filter(
    (item) => item.StrategyName === strategyName
  );
};

export const getLegParameters = (strategyName: string): LegParameter[] => {
  return SIMPLE_LEG_PARAMETERS.filter((item) => item.StrategyName === strategyName);
};

