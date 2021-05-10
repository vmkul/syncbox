#!/bin/bash

rm -rf server client
npm start &
sleep 2

for FILE_NAME in file1 file2 file3
do
  dd if=/dev/urandom of=./client/$FILE_NAME bs=1024 count=1024 > /dev/null 2>&1
done

mkdir ./client/dir1
sleep 0.5

for FILE_NAME in file1 file2 file3
do
  dd if=/dev/urandom of=./client/dir1/$FILE_NAME bs=1024 count=1024 > /dev/null 2>&1
done

mkdir ./client/dir2
sleep 0.5

for FILE_NAME in file1 file2 file3
do
  dd if=/dev/urandom of=./client/dir2/$FILE_NAME bs=1024 count=1024 > /dev/null 2>&1
done

sleep 0.5
rm -rf ./client/dir2
rm ./client/file1

sleep 4

if diff -qr client server; then
  echo "Directories equal. Test passed."
  EXIT_CODE=0
else
  echo "Test failed."
  EXIT_CODE=1
  exit 1
fi

pkill node
exit $EXIT_CODE
