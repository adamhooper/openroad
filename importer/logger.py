#!/usr/bin/env python3

class Logger:
    def __init__(self, file):
        self.file = file

    def info(self, message):
        self.file.write(message)
        self.file.write("\n")
        self.file.flush()
