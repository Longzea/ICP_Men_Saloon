import { Record, StableBTreeMap, Principal, Vec, Result, nat64, ic, Opt, float32 } from 'azle';
import { v4 as uuidv4 } from 'uuid';

type Saloon = Record<{
    owner: Principal;
    id: string;
    saloonName: string;
    saloonLocation: string;
    attachmentURL: string;
    servicesRendered: Vec<ServiceRendered>;
    rating: float32;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
}>;

type SaloonPayload = Record<{
    saloonName: string;
    saloonLocation: string;
    attachmentURL: string;
}>;

type ServiceRendered = Record<{
    id: string;
    serviceName: string;
    serviceDescription: string;
    serviceAmount: float32; // Assuming it's a numeric type
    createdAt: nat64;
}>;

type ServiceRenderedPayload = Record<{
    serviceName: string;
    serviceDescription: string;
    serviceAmount: float32; // Assuming it's a numeric type
}>;

// storage for storing all created saloon.
const saloonStorage = new StableBTreeMap<string, Saloon>(0, 44, 1024);

// Function to fetch all saloons created.
export function getAllSaloons(): Result<Vec<Saloon>, string> {
    return Result.Ok(saloonStorage.values());
}

// Function that gets the information about a saloon through its id.
export function getSaloonById(id: string): Result<Saloon, string> {
    return match(saloonStorage.get(id), {
        Some: (saloon) => Result.Ok<Saloon, string>(saloon),
        None: () => Result.Err<Saloon, string>(`The saloon with id=${id} is not found`),
    });
}

// Function that allows users to create a new saloon.
export function createSaloon(payload: SaloonPayload): Result<Saloon, string> {
    const saloon: Saloon = {
        id: uuidv4(),
        owner: ic.caller(),
        rating: 1.0,
        servicesRendered: [],
        createdAt: ic.time(),
        updatedAt: Opt.None,
        ...payload,
    };
    saloonStorage.insert(saloon.id, saloon);
    return Result.Ok(saloon);
}

// Function that allows users to create a new service for their saloon.
export function createService(id: string, payload: ServiceRenderedPayload): Result<Saloon, string> {
    return match(saloonStorage.get(id), {
        Some: (saloon) => {
            // Checks if caller is the same as the owner of the saloon
            if (!saloon.owner.equals(ic.caller())) {
                return Result.Err<Saloon, string>("You are not the owner of this saloon");
            }

            const serviceRendered: ServiceRendered = {
                id: uuidv4(),
                createdAt: ic.time(),
                ...payload,
            };

            // Push the new service into the existing servicesRendered Vec
            saloon.servicesRendered.push(serviceRendered);

            const updatedSaloon: Saloon = {
                ...saloon,
                updatedAt: Opt.Some(ic.time()),
            };

            saloonStorage.insert(saloon.id, updatedSaloon);
            return Result.Ok<Saloon, string>(updatedSaloon);
        },
        None: () => Result.Err<Saloon, string>("Unable to carry out the following function"),
    });
}

// Function that allows users to delete their saloon.
export function deleteSaloon(id: string): Result<Saloon, string> {
    return match(saloonStorage.get(id), {
        Some: (saloon) => {
            // Check if caller is the same as owner
            if (!saloon.owner.equals(ic.caller())) {
                return Result.Err<Saloon, string>("You are not the owner of this saloon");
            }
            saloonStorage.remove(id);
            return Result.Ok<Saloon, string>(saloon);
        },
        None: () => Result.Err<Saloon, string>(`Couldn't delete saloon with this id=${id}. Saloon not found.`),
    });
}

// Function that allows users to rate a saloon.
export function rateSaloon(id: string, rate: number): Result<Saloon, string> {
    // Gets the saloon details by its id
    const saloonRating = match(saloonStorage.get(id), {
        Some: (saloon) => {
            return saloon.rating;
        },
        None: () => Result.Err<Saloon, string>(`Error updating saloon with the id=${id}. Saloon not found`),
    });

    // Calculates the new rating by incorporating the user's rating
    const newRating = (saloonRating * saloon.rating + rate) / (saloonRating + 1);

    return match(saloonStorage.get(id), {
        Some: (saloonData) => {
            const saloon: Saloon = {
                ...saloonData,
                rating: newRating,
                updatedAt: Opt.Some(ic.time()),
            };
            saloonStorage.insert(saloon.id, saloon);
            return Result.Ok<Saloon, string>(saloon);
        },
        None: () => Result.Err<Saloon, string>(`Error rating saloon with the id=${id}. Saloon not found`),
    });
}

// Function to update a saloon by its id.
export function updateSaloonById(id: string, payload: SaloonPayload): Result<Saloon, string> {
    return match(saloonStorage.get(id), {
        Some: (saloon) => {
            // Check if caller is the same as the owner of the saloon
            if (!saloon.owner.equals(ic.caller())) {
                return Result.Err<Saloon, string>("You are not the owner of this saloon");
            }

            const updatedSaloon: Saloon = { ...saloon, ...payload, updatedAt: Opt.Some(ic.time()) };
            saloonStorage.insert(saloon.id, updatedSaloon);
            return Result.Ok<Saloon, string>(updatedSaloon);
        },
        None: () => Result.Err<Saloon, string>(`Couldn't update the saloon with this id=${id}. Saloon not found`),
    });
}

// A workaround to make uuid package work with Azle
globalThis.crypto = {
    getRandomValues: () => {
        let array = new Uint8Array(32);

        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }

        return array;
    },
};
