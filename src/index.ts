import { $query, $update, Record, StableBTreeMap, Principal, Vec, match, Result, nat64, ic, Opt, float32 } from 'azle';
import { v4 as uuidv4 } from 'uuid';

type Saloon = Record<{
    owner : Principal;
    id: string;
    saloonName: string;
    saloonLocation: string;
    attachmentURL: string;
    servicesRendered : Vec<ServiceRendered>;
    rating : float32;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
}>

type SaloonPayload = Record<{
    saloonName: string;
    saloonLocation: string;
    attachmentURL: string;
}>

type ServiceRendered = Record<{
    id: string;
    serviceName: string;
    serviceDescription: string;
    serviceAmount: string;
    createdAt: nat64;
}>

type ServiceRenderedPayload = Record<{
    serviceName: string;
    serviceDescription: string;
    serviceAmount: string;
}>

// storage for storing all created saloon.
const saloonStorage = new StableBTreeMap<string, Saloon>(0, 44, 1024);


// fetches all saloons created. 
$query;
export function getAllSaloons(): Result<Vec<Saloon>, string> {
    return Result.Ok(saloonStorage.values());
}


// gets the information about a saloon through it's id.
$query;
export function getSaloonById(id: string): Result<Saloon, string> {
    return match(saloonStorage.get(id), {
        Some: (saloon) => Result.Ok<Saloon, string>(saloon),
        None: () => Result.Err<Saloon, string>(`The saloon with id=${id} is not found`)
    });
}


// Function that allow users to create a new saloon
$update;
export function createSaloon(payload: SaloonPayload): Result<Saloon, string> {
    const saloon: Saloon = { id: uuidv4(), owner: ic.caller(), rating: 1.0, servicesRendered : [], createdAt: ic.time(), updatedAt: Opt.None, ...payload };
    saloonStorage.insert(saloon.id, saloon);
    return Result.Ok(saloon);
}


// Function that allow users to create a new service for their saloon
$update;
export function createService (id: string, payload : ServiceRenderedPayload): Result<Saloon, string> {
    const serviceRendered: ServiceRendered = {id: uuidv4(), createdAt: ic.time(), ...payload };
    const saloon = match(saloonStorage.get(id), {
        Some: (saloon) => {

            if(saloon.owner.toString() !== ic.caller().toString()){
                return Result.Err<Saloon, string>("You are not the owner of this saloon")
            }

            const servicesRendered: Vec<any> = saloon.servicesRendered; 
            servicesRendered.push(serviceRendered);
            const Saloon: Saloon = {
                    ...saloon,
                    servicesRendered: servicesRendered 
                }

            saloonStorage.insert(saloon.id, Saloon);

            return Result.Ok<Saloon, string>(Saloon);
            
        },
        None: () => Result.Err<Saloon, string>("Unable to carry out the following function")
    })

    return saloon

}

// allow users to delete his / her saloon
$update;
export function deleteSaloon(id: string): Result<Saloon, string> {
    return match(saloonStorage.remove(id), {
        Some: (deletedSaloon) => Result.Ok<Saloon, string>(deletedSaloon),
        None: () => Result.Err<Saloon, string>(`couldn't delete a saloon with id=${id}. saloon not found.`)
    });
}


$update;
export function rateSaloon(id: string, rate: number): Result<Saloon, string> {
    
    const saloonRating: any = match(saloonStorage.get(id), {
        Some: (saloon) => {
            return saloon.rating;
        },
        None: () => Result.Err<Saloon, string>(`Error updating saloon with the id=${id}. Saloon not found`)
    })

    const rating: any = ((saloonRating + rate) / 5);

    return match(saloonStorage.get(id), {
        Some: (saloonData) => {
            const saloon: Saloon = {
                ...saloonData,
                rating,
                updatedAt: Opt.Some(ic.time())
            };
            saloonStorage.insert(saloon.id, saloon);
            return Result.Ok<Saloon, string>(saloon);
        },
        None: () => Result.Err<Saloon, string>(`Error rating saloon with the id=${id}. Saloon not found`)
    });
}


// function to update a saloon by its id
$update;
export function updateSaloonById(id: string, payload: SaloonPayload): Result<Saloon, string> {
    return match(saloonStorage.get(id), {
        Some: (saloon) => {
            const updatedSaloon: Saloon = {...saloon, ...payload, updatedAt: Opt.Some(ic.time())};
            saloonStorage.insert(saloon.id, updatedSaloon);
            return Result.Ok<Saloon, string>(updatedSaloon);
        },
        None: () => Result.Err<Saloon, string>(`couldn't update the saloon with this id=${id}. saloon not found`)
    });
}

// a workaround to make uuid package work with Azle
globalThis.crypto = {
    getRandomValues: () => {
        let array = new Uint8Array(32);

        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }

        return array;
    }
};