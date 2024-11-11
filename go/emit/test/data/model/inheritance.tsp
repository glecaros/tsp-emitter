namespace modeltest;

model Person {
  name: string;
}

model Employee extends Person {
  salary: integer;
}
