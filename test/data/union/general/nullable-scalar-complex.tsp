namespace generalunion;

union Name {
  null,
  string,
  CompoundName,
}

model CompoundName {
  name: string;
  secondName: string;
}

model Person {
  name: Name;
}
