package generalunion

import (
	"testing"
)

func TestLocaleDeserializationLocaleDefinition(t *testing.T) {
	data := []byte(`{"language":"es","culture":"CL"}`)
	locale, err := UnmarshalLocale(data)
	if err != nil {
		t.Fatalf("UnmarshalLocale failed: %v", err)
	}

	if locale.Type() != "LocaleDefinition" {
		t.Errorf("Expected type to be 'LocaleDefinition' but got %s", locale.Type())
	}

	switch e := locale.(type) {
	case LocaleLocaleDefinition:
		if e.Value.Language != "es" {
			t.Errorf("Expected language to be 'es' but got %s", e.Value.Language)
		}
		if e.Value.Culture != "CL" {
			t.Errorf("Expected culture to be 'CL' but got %s", e.Value.Culture)
		}
	case LocaleLocaleStringValues:
		t.Errorf("Expected type to be 'LocaleLocaleDefinition' but got %s", e.Type())
	}
}

func TestLocaleDeserializationLocaleString(t *testing.T) {
	data := []byte(`"en-US"`)
	locale, err := UnmarshalLocale(data)
	if err != nil {
		t.Fatalf("UnmarshalLocale failed: %v", err)
	}

	if locale.Type() != "LocaleStringValues" {
		t.Errorf("Expected type to be 'LocaleStringValues' but got %s", locale.Type())
	}

	switch e := locale.(type) {
	case LocaleLocaleDefinition:
		t.Errorf("Expected type to be 'LocaleLocaleStringValues' but got %s", e.Type())
	case LocaleLocaleStringValues:
		if e.Value != "en-US" {
			t.Errorf("Expected culture to be 'en-US' but got %s", e.Value)
		}
	}
}
