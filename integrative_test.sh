#!/bin/bash

if diff -qr client server; then
  echo "Directories equal. Test passed."
  exit 0
else
  echo "Test failed."
  exit 1
fi

