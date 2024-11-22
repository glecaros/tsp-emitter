package generalunion

import "testing"

func TestNameDeserializationString(t *testing.T) {
	data := []byte(`"Brutus"`)
	name, err := UnmarshalName(data)
	if err != nil {
		t.Fatalf("UnmarshalName failed: %v", err)
	}

	if name.Type() != "string" {
		t.Errorf("Expected type to be 'string' but got %s", name.Type())
	}

	switch e := name.(type) {
	case NameString:
		if e.Value != "Brutus" {
			t.Errorf("Expected name to be 'Brutus' but got %s", e.Value)
		}
	case NameCompoundName:
		t.Errorf("Expected type to be 'NameString' but got %s", e.Type())
	}
}

func TestNameDeserializationCompoundName(t *testing.T) {
	data := []byte(`{"name":"Julius","secondName":"Caesar"}`)
	name, err := UnmarshalName(data)
	if err != nil {
		t.Fatalf("UnmarshalName failed: %v", err)
	}

	if name.Type() != "CompoundName" {
		t.Errorf("Expected type to be 'CompoundName' but got %s", name.Type())
	}

	switch e := name.(type) {
	case NameString:
		t.Errorf("Expected type to be 'NameCompoundName' but got %s", e.Type())
	case NameCompoundName:
		if e.Value.Name != "Julius" {
			t.Errorf("Expected name to be 'Julius' but got %s", e.Value.Name)
		}
		if e.Value.SecondName != "Caesar" {
			t.Errorf("Expected secondName to be 'Caesar' but got %s", e.Value.SecondName)
		}
	}
}

func TestPersonDeserializationString(t *testing.T) {
	data := []byte(`{"name":"Brutus"}`)
	var person Person
	if err := person.UnmarshalJSON(data); err != nil {
		t.Fatalf("UnmarshalPerson failed: %v", err)
	}

	if !person.Name.IsSet() {
		t.Fatalf("Expected name to be set")
	}

	if person.Name.Value().Type() != "string" {
		t.Errorf("Expected type to be 'string' but got %s", person.Name.Value().Type())
	}

	switch e := person.Name.Value().(type) {
	case NameString:
		if e.Value != "Brutus" {
			t.Errorf("Expected name to be 'Brutus' but got %s", e.Value)
		}
	case NameCompoundName:
		t.Errorf("Expected type to be 'NameString' but got %s", e.Type())
	}
}
