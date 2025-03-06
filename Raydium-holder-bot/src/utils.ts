import dotenv from 'dotenv'
import fs from 'fs'
dotenv.config()
import { init, settings } from '..';
import { rl } from '../menu/menu';
import { PublicKey } from '@solana/web3.js';

export const retrieveEnvVariable = (variableName: string) => {
  const variable = process.env[variableName] || ''
  if (!variable) {
    console.log(`${variableName} is not set`)
    process.exit(1)
  }
  return variable
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const saveDataToFile = (newData: string[], filePath: string = "data.json") => {
  try {
    let existingData: string[] = [];

    // Check if the file exists
    if (fs.existsSync(filePath)) {
      // If the file exists, read its content
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      existingData = JSON.parse(fileContent);
    }

    // Add the new data to the existing array
    existingData.push(...newData);

    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));

  } catch (error) {
    console.log('Error saving data to JSON file:', error);
  }
};

export function readJson(filename: string = "data.json"): string[] {
  try {
    if (!fs.existsSync(filename))
      return []

    const data = fs.readFileSync(filename, 'utf-8');
    const parsedData = JSON.parse(data)
    return parsedData
  } catch (error) {
    return []
  }
}

export interface Settings {
  mint: null | PublicKey,
  poolId: null | PublicKey,
  buyMax: number,
  buyMin: number,
  walletNum: number,
  timeInterval: number
}

export interface SettingsStr {
  mint: null | string,
  poolId: null | string,
  buyMax: null | string,
  buyMin: null | string,
  walletNum: null | string,
  timeInterval: null | string
}

export const saveSettingsToFile = (newData: Settings, filePath: string = "settings.json") => {
  try {
    let existingData: Settings

    // Check if the file exists
    if (fs.existsSync(filePath)) {
      try {
        // If the file exists, read its content
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        existingData = JSON.parse(fileContent);
      } catch (parseError) {
        // If there is an error parsing the file, delete the corrupted file
        console.error('Error parsing JSON file, deleting corrupted file:', parseError);
        fs.unlinkSync(filePath);
      }
    }

    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));

  } catch (error) {
    console.log('Error saving data to JSON file:', error);
  }
};

export function readSettings(filename: string = "settings.json"): SettingsStr {
  try {
    if (!fs.existsSync(filename)) {
      // If the file does not exist, create an empty array
      return {
        mint: "1",
        poolId: "1",
        buyMax: "1",
        buyMin: "1",
        walletNum: "1",
        timeInterval: "1"
      }
    }
    const data = fs.readFileSync(filename, 'utf-8');
    const parsedData = JSON.parse(data)
    return parsedData
  } catch (error) {
    return {
      mint: "1",
      poolId: "1",
      buyMax: "1",
      buyMin: "1",
      walletNum: "1",
      timeInterval: "1"
    }
  }
}

export const saveNewFile = (newData: string[], filePath: string = "data.json") => {
  try {
    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));

  } catch (error) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`File ${filePath} deleted and create new file.`);
      }
      fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));
      console.log("File is saved successfully.")
    } catch (error) {
      console.log('Error saving data to JSON file:', error);
    }
  }
};