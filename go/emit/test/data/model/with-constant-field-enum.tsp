namespace modeltest;

model Foo {
  bar: Bar.variant1;
}

union Bar {
  variant1: "one",
  variant2: "two",
}
