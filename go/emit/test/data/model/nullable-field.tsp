namespace modeltest;

model HasANullable {
    firstNullableField: string | null;
    secondNullableField: "first" | null;
    thirdNullableField: "one" | "two" | null;
}