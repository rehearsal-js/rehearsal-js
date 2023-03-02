export interface Rabbit {
    color: string;
    species: string;
    name: string;
}

export function feedRabbit(rabbit: Rabbit) {
    console.log(`Rabbit ${rabbit.name} loves to eat fruit, not hay.`);
}