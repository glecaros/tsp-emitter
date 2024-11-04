@encodedName("text/x-go", "openai")
namespace OpenAI;

@doc("The RealtimeVoice model specifies the voice to use for the audio stream.")
union RealtimeVoice {
  string,
  alloy: "alloy",
  shimmer: "shimmer",
  echo: "echo",
}


union RealtimeAudioFormat {
  string,
  pcm16: "pcm16",
  g711_ulaw: "g711_ulaw",
  g711_alaw: "g711_alaw",
}

alias Test = string | "asdf" | "qwer";


model Foo {
    @doc("The foo field")
    @encodedName("application/json", "bar_field")
    bar: Test;
}

union RealtimeAudioInputTranscriptionModel {
  string,
  whisper_1: "whisper-1",
}

// model RealtimeAudioInputTranscriptionSettings {
//   `model`?: RealtimeAudioInputTranscriptionModel = RealtimeAudioInputTranscriptionModel.whisper_1;
// }
