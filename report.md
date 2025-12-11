## Summary

This project lets the user upload files, assign tags, search for uploaded files, and share files with public links.

## Demo Video

[link](https://cdn.duhby.dev/Wn3t8_0iIr/cs452%20report.mp4)

## Creating this project, I learned how to

- deploy to netlify
- create a neondb database
- use sveltekit
- use sveltekit's new remote functions
- use better-auth and shadcn-svelte with sveltekit
- create a github oauth flow
- use cloudflare workers
- use an s3 bucket api
- use drizzle with postgres

## AI Features

The project doesn't interact with AI.

## AI Usage

I used AI to help with the UI design since that's something I'm not as good at. I avoided it when doing more sensitive things like project configuration, library setup, etc and instead followed the documentation directly for those tasks since I don't trust AI to write that code and I want to be sure that it works properly.

## Why it's interesting

This project is interesting to me because I have files scattered across my laptop, pc, and phone, and I want an easy way to organize them. I also really like how easy it is to copy the link to the file and share it with friends even if it's a large file, and Backblaze doesn't charge for it because it goes through Cloudflare.

## Key learnings from the project

- Server side auth checks help prevent vulnerabilities since the user can always make raw requests
- Sending a signed URL for the user to upload directly instead of having it go through the server saves a lot of bandwidth cost and is faster
- Implmementing things as documented or recommended by the library or the company is better 99% of the time, like integrating better-auth into sveltekit, or using cloudflare workers as a cdn for backblaze requests
- Using remote functions with svelte's #await syntax is a lot easier than load functions that are tied to a page or layout, and you don't have to set up trpc for type safety, and sveltekit automatically caches requests per page so you don't have to worry about optimizations which is nice

## Failover strategy, scaling characteristics, performance characteristics, authentication, concurrency, etc.

- Faliover, scaling, and performance are all directly tied to Netlify and NeonDB and how much you pay for them. They both use AWS and scale horizontally. I don't think either of them have backups if AWS goes down though.
- Authentication uses better-auth with github oauth, which could be configured to use more oauth solutions like google, and users could sign in with either as long as their email is the same. It saves session tokens as cookies and refreshes tokens if the user doesn't take too long to revisit the site, otherwise they have to log in again.
- I currently deny any user from creating an account so only I can sign in since I already have an account, but with multiple accounts it still works since all files, tags, etc are connected to the specific user, and it only shows your files and tags, and all operations are verified server side. Sveltekit and postgresql allow for concurrency automatically, and no requests are blocking. No items depend on each other outside of a given user either so there won't be any transaction resolution conflicts.
