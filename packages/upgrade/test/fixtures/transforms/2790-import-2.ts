export class Employee {
  name: string;
  badgeNumber?: string;

  constructor({ name, badgeNumber }: { name: string; badgeNumber: string }) {
    this.name = name;
    this.badgeNumber = badgeNumber;
  }
}
