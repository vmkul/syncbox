#!/bin/bash

rm -rf server client
npm start &
sleep 2
cd client || exit 1

for FILE_NAME in file1 file2 file3
do
  dd if=/dev/urandom of=./$FILE_NAME bs=1024 count=1024 > /dev/null 2>&1
done

mkdir ./dir1
sleep 0.5

for FILE_NAME in file1 file2 file3
do
  dd if=/dev/urandom of=./dir1/$FILE_NAME bs=1024 count=1024 > /dev/null 2>&1
done

mkdir ./dir2
sleep 0.5

for FILE_NAME in file1 file2 file3
do
  dd if=/dev/urandom of=./dir2/$FILE_NAME bs=1024 count=1024 > /dev/null 2>&1
done

sleep 0.5
rm -rf ./dir2
rm ./file1

sleep 4
cd ..

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
