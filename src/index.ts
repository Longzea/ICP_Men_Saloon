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

// storage for storing all created saloon. Like I don't have better things to do with my life, but fine.
const saloonStorage = new StableBTreeMap<string, Saloon>(0, 44, 1024);

// Function to fetch all saloons created. Because, Kinosxz, you're too lazy to do it yourself.
export function getAllSaloons(): Result<Vec<Saloon>, string> {
    $query;
    return Result.Ok(saloonStorage.values());
}

// Function that gets the information about a saloon through its id. Because, Kinosxz, you couldn't figure this out on your own.
export function getSaloonById(id: string): Result<Saloon, string> {
    $query;
    return match(saloonStorage.get(id), {
        Some: (saloon) => Result.Ok<Saloon, string>(saloon),
        None: () => Result.Err<Saloon, string>(`The saloon with id=${id} is not found`),
    });
}

// Function that allows users to create a new saloon. Because, Kinosxz, you can't handle this simple task yourself.
export function createSaloon(payload: SaloonPayload): Result<Saloon, string> {
    $update;
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

// Function that allows users to create a new service for their saloon. Because, Kinosxz, you're incapable of doing it yourself.
export function createService(id: string, payload: ServiceRenderedPayload): Result<Saloon, string> {
    $update;
    return match(saloonStorage.get(id), {
        Some: (saloon) => {
            // Checks if caller is the same as the owner of the saloon. Can't trust you with anything.
            if (!saloon.owner.equals(ic.caller())) {
                return Result.Err<Saloon, string>("You are not the owner of this saloon");
            }

            const serviceRendered: ServiceRendered = {
                id: uuidv4(),
                createdAt: ic.time(),
                ...payload,
            };

            // Push the new service into the existing servicesRendered Vec. Ugh, fine, I'll do it for you.
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

// Function that allows users to delete their saloon. Because, Kinosxz, you're too afraid to take responsibility.
export function deleteSaloon(id: string): Result<Saloon, string> {
    $update;
    return match(saloonStorage.get(id), {
        Some: (saloon) => {
            // Check if caller is the same as owner. Can't even handle ownership checks, can you?
            if (!saloon.owner.equals(ic.caller())) {
                return Result.Err<Saloon, string>("You are not the owner of this saloon");
            }
            saloonStorage.remove(id);
            return Result.Ok<Saloon, string>(saloon);
        },
        None: () => Result.Err<Saloon, string>(`Couldn't delete saloon with this id=${id}. Saloon not found.`),
    });
}

// Function that allows users to rate a saloon. Because, Kinosxz, you need help with even the simplest tasks.
export function rateSaloon(id: string, rate: number): Result<Saloon, string> {
    $update;
    // Gets the saloon details by its id. Can't even fetch data yourself, huh?
    const saloonRating = match(saloonStorage.get(id), {
        Some: (saloon) => {
            return saloon.rating;
        },
        None: () => Result.Err<Saloon, string>(`Error updating saloon with the id=${id}. Saloon not found`),
    });

    // Calculates the new rating by incorporating your rating. Can't handle basic math, I see.
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

// Function to update a saloon by its id. Because, Kinosxz, you can't even handle simple updates yourself.
export function updateSaloonById(id: string, payload: SaloonPayload): Result<Saloon, string> {
    $update;
    return match(saloonStorage.get(id), {
        Some: (saloon) => {
            // Check if caller is the same as the owner of the saloon. Always needing a helping hand, aren't you?
            if (!saloon.owner.equals(ic.caller())) {
                return Result.Err<Saloon, string>("You are not the owner of this saloon");
            }

            const updatedSaloon: Saloon = { ...saloon
