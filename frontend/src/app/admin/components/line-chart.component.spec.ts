import { niceTicks } from './line-chart.component';

describe('niceTicks', () => {
  it('rounds the axis to clean steps that cover the max', () => {
    expect(niceTicks(21)).toEqual([0, 10, 20, 30]);
    expect(niceTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(150)).toEqual([0, 50, 100, 150]);
  });

  it('never returns a flat axis', () => {
    expect(niceTicks(0)).toEqual([0, 1]);
  });
});
