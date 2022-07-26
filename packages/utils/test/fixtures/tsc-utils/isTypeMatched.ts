interface T10 { field: string; }

type T11 = string | number;

interface T12 extends T10 {
  id: string;
}

interface T13 { id: string; }

type T14 = T10 & T13;

