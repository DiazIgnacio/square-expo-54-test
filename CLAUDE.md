# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native mobile app built with Expo SDK 54, targeting iOS, Android, and web platforms. The project is a proof-of-concept for integrating Square payments SDK.

## Commands

- `npm start` or `npx expo start` - Start the Expo development server
- `npm run ios` - Start on iOS simulator
- `npm run android` - Start on Android emulator
- `npm run web` - Start on web
- `npm run lint` - Run ESLint

## Architecture

- **Routing**: Uses expo-router with file-based routing. Routes are defined by files in the `app/` directory.
- **Root Layout**: `app/_layout.tsx` configures the navigation stack
- **Path Aliases**: `@/*` maps to the project root (configured in tsconfig.json)

## Key Configuration

- **New Architecture**: React Native's new architecture is enabled (`newArchEnabled: true`)
- **React Compiler**: Experimental React Compiler is enabled
- **Typed Routes**: Expo Router typed routes are enabled for type-safe navigation
- **Strict TypeScript**: Strict mode is enabled
