namespace modeltest;

model HasNullableValueUnionFields {
  singleValue: "first" | null;
  multipleValues: "one" | "two" | null;
}
