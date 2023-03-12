interface P {
  a: number;
  b: string;
  c: number[];
  d: any;
}

const A = ({ a, b, c, d }: P) => (
  <div>
    {a}
    {b}
    {c}
    {d}
  </div>
);

export const Bar = () => <A b={''} c={[]} d={undefined}></A>;
