# 📦 SyncBox

-------------------------------------------------
## What is SyncBox?
SyncBox is a file hosting service that inherits the idea of Dropbox, 
a service that brings files together in one central place by creating 
a special folder on the user's computer. The contents of these folders 
are synchronized to servers and to other computers and devices where the 
user has installed the software, keeping the same files up-to-date on all devices.

-------------------------------------------------

## Main functionality:

- [x] __Synchronization of files and directories__
- [x] __Serve many users at a time__
- [x] __Trigger sync by Drag'n'Drop (no special commands)__

### Additional features:

- [x] __User authentication__
- [x] __Data encryption__
- [x] __Data compression__

-------------------------------------------------

## Technologies

* Node.js
  * Net module (TCP socket)
  * fs.FSWatcher
  * Zlib
  * Web Crypto API  