"use client";
import { useEffect, useState, useRef } from "react";
import { useChat } from "ai/react";
import { ChatMessages } from "@/app/(chat)/components/ChatMessages";
import { usePathname } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import { ScrollToBottomButton } from "@/app/(chat)/components/ScrollToBottomButton";
import { ChatInput } from "@/app/(chat)/components/ChatInput";
import { upsertChat } from "@/app/(chat)/lib/actions.ts";
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { SuggestedQuestionsContainer } from "@/app/(chat)/components/_suggested_questions/SuggestedQuestionsContainer";
import { useScrollToBottom } from "@/app/(chat)/lib/hooks/useScrollToBottom";
import { useRouter } from "next/navigation";
import { addToChatCount } from "@/app/(chat)/lib/actions";

export const ChatContainer = ({
  shuffledQuestions = [],
  initialMessages = [],
  id,
}) => {
  const [savingError, setSavingError] = useState(null);
  const [sources, setSources] = useState([]);
  const [isBeforeStream, setIsBeforeStream] = useState(false);
  const [isError, setIsError] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  const {
    messages,
    input,
    append,
    handleInputChange,
    setMessages,
    handleSubmit,
    reload,
    stop,
    isLoading,
    data, // Add this to access the StreamData
  } = useChat({
    initialMessages,
    api: "/api/chat", // Ensure this matches your API route
    onResponse: () => {
      setIsBeforeStream(false);
    },
    onError: (error) => {
      setIsError(true);
      console.error(error);
    },
    onFinish: async (message) => {
      await addToChatCount(message.content.length);
    },
  });

  const wrappedHandleSubmit = (event, chatRequestOptions) => {
    setIsBeforeStream(true);
    handleSubmit(event, chatRequestOptions);
  };

  const { containerRef, isAtBottom, forceScroll } = useScrollToBottom(messages);

  // Save scroll position and input before refresh
  const saveState = () => {
    sessionStorage.setItem("scrollPosition", containerRef.current.scrollTop);
    sessionStorage.setItem("input", input);
  };

  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem("scrollPosition");
    const savedInput = sessionStorage.getItem("input");
    if (savedScrollPosition && containerRef.current) {
      containerRef.current.scrollTo(0, parseInt(savedScrollPosition, 10));
      sessionStorage.removeItem("scrollPosition");
    }
    if (savedInput) {
      handleInputChange({ target: { value: savedInput } });
      sessionStorage.removeItem("input");
    }
  }, [containerRef, handleInputChange]);

  // TODO: Abstract out to useActionWithToast hook (?)
  const handleChatUpdate = async () => {
    if (messages.length < 2) return;

    // If the user is not on the chat page, redirect to the chat page
    if (!pathname.includes("chat")) {
      window.history.replaceState({}, "", `/chat/${id}`);
      localStorage.setItem("newChatID", id);
    }

    const title = messages[0].content.substring(0, 100) || "New chat";
    try {
      const { data: isNewChat, error } = await upsertChat(id, title, messages);

      if (error) throw new Error(error);

      // If there is a saving error on last update, and this update is successful, reset it.
      if (savingError) {
        setSavingError(null);
        toast({
          title: "Chat saved",
          description: "Your progress has been saved.",
        });
      }
      if (isNewChat) {
        saveState();
        router.refresh();
      }
    } catch (error) {
      // Prevent the same error from being shown twice
      if (savingError === error.message) return;
      setSavingError(error.message);

      // Prepare the error message to be displayed
      const errorMessage = error.message.trim();
      const errorMessageWithPeriod = errorMessage.endsWith(".")
        ? errorMessage
        : errorMessage + ".";

      toast({
        title: "Error saving chat.",
        description: `${errorMessageWithPeriod} You can still chat in this session, but your progress will not be saved.`,
        duration: 10000,
        action: (
          <ToastAction
            altText="Retry"
            onClick={() => {
              setSavingError(null);
              handleChatUpdate();
            }}
          >
            Retry
          </ToastAction>
        ),
      });
    }
  };

  const debouncedHandleChatUpdate = useDebounce(handleChatUpdate, 1000);

  useEffect(() => {
    debouncedHandleChatUpdate();
  }, [messages, debouncedHandleChatUpdate]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage?.role === "assistant" &&
      !lastMessage.sources &&
      !isLoading &&
      data?.length > 0
    ) {
      // Get the source IDs that the assistant reported as used
      const contentParts = lastMessage.content.split("&&--");
      const selfReportedSourceIDs =
        contentParts.length > 1 ? JSON.parse(contentParts[1]) : [];

      // Use the sources from StreamData
      const sources = data[data.length - 1]?.sources || [];

      // Combine them with the list of sources actually given to the assistant,
      // marking which ones were used and which ones were not.
      const combinedSources = sources.map((source) =>
        selfReportedSourceIDs.includes(source.chunk_id)
          ? { ...source, reported_as_used: true }
          : { ...source, reported_as_used: false }
      );

      // Update the last message to include the combined sources
      setMessages((prevMessages) => [
        ...prevMessages.slice(0, -1),
        { ...lastMessage, sources: combinedSources },
      ]);
    }
  }, [messages, data, setMessages, isLoading]);

  const handleSuggestedQuestionClick = (question) => {
    append({
      content: question.question,
      role: "user",
    });
    setIsBeforeStream(true);
    handleInputChange({ target: { value: "" } });
  };

  return (
    <div
      ref={containerRef}
      className="group flex justify-center w-full overflow-auto pl-0 peer-[[data-state=open]]:lg:pl-[300px] peer-[[data-state=open]]:xl:pl-[350px] duration-300 ease-in-out"
    >
      <div className="flex flex-col w-full max-w-[700px] h-full pb-40 px-7 pt-10 items-center">
        <ChatMessages
          isLoading={isLoading}
          isBeforeStream={isBeforeStream}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isError={isError}
        />
      </div>

      {/* Apply container width to child because fixed elements are not limited by parent width. Apply padding here because I'm lazy */}
      <div className="flex flex-col w-full max-w-[700px] px-5 fixed bottom-0 items-center gap-3">
        {!isAtBottom && (
          <ScrollToBottomButton
            isAtBottom={isAtBottom}
            forceScroll={forceScroll}
          />
        )}
        {messages.length === 0 && (
          <SuggestedQuestionsContainer
            handleSuggestedQuestionClick={handleSuggestedQuestionClick}
            shuffledQuestions={shuffledQuestions}
          />
        )}
        <ChatInput
          handleInputChange={handleInputChange}
          handleSubmit={wrappedHandleSubmit}
          input={input}
          isError={isError}
          isLoading={isLoading}
          stop={stop}
        />
        <div className="w-full max-w-[660px] px-5 h-10 bg-gray-100 fixed bottom-0"></div>
      </div>
    </div>
  );
};
