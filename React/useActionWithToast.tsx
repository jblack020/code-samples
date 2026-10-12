import { useToast } from "@/components/ui/use-toast";
import { QueryError } from "@supabase/supabase-js";
import { ToastAction } from "@/components/ui/toast";
import React, { useRef, useCallback, useTransition } from "react";

type ActionWithToastOptions = {
  retry?: boolean;
  proceed?: boolean;
  customErrorAction?: {
    label: string;
    action: any;
    requiredToProceed?: boolean;
  };
  errorDelay?: number;
  successMessage?: string;
  errorTitle?: string;
  errorMessage?: string;
  onStart?: () => Promise<void> | void;
  onSuccess?: (result: any) => Promise<void> | void;
  onError?:
    | ((error: QueryError) => Promise<void | boolean>)
    | ((error: QueryError) => boolean | void);
  onFinish?: () => Promise<void> | void;
};

// TODO: Refactor JSDOC descriptions
// TODO: Ensure that data is returned correctly on success

/**
 * @param action - The action to execute. Must throw an error if the action fails.
 * @param options - The options for the action. This includes:
 *   - retry: A boolean to determine if the action should be retried.
 *   - proceed: A boolean to determine if the user has to manually click the "Continue" button to proceed.
 *   - errorDelay: A number to determine the delay in milliseconds between when the error message is shown and when the function returns
 *   - errorMessage: A message to display when an error occurs.
 *   - successMessage: A message to display when the action is successful. No toast will be displayed if this is not provided.
 *   - errorTitle: A custom title to display when an error occurs.
 *   - onSuccess: A callback function to execute when the action is successful. Passes the result of the action.
 *   - onError: A callback function to execute when an error occurs. Passes the error. To supress the error toast, return true.
 *   - onFinish: A callback function to execute when the action is finished, regardless of success or error. Passes no arguments.
 * @returns {Object} An object containing:
 *   - executeAction: A function to execute the action with the provided arguments.
 */

export const useActionWithToast = (
  action: (...args: any[]) => Promise<any>,
  options: ActionWithToastOptions = {}
) => {
  const { toast } = useToast();
  const proceedRef = useRef<{
    promise: Promise<void>;
    resolve: () => void;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    retry = false,
    proceed = false,
    customErrorAction,
    errorDelay = 0,
    errorTitle = "Error encountered while completing action",
    errorMessage,
    successMessage,
    onStart,
    onSuccess,
    onError,
    onFinish,
  } = options;

  const createProceedPromise = useCallback(() => {
    let resolve: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    proceedRef.current = { promise, resolve: resolve! };
    return promise;
  }, []);

  const executeAction = useCallback(
    async (...args: any[]) => {
      startTransition(async () => {
        try {
          await onStart?.();
          const { success, data, error } = await action(...args);

          // If the action is not successful, throw an error to enter the catch block
          if (!success) throw new Error(error);

          // If the action is successful, show a toast
          if (successMessage) {
            toast({
              title: "Success",
              description: successMessage,
              duration: 5000,
            });
          }
          await onSuccess?.(data);
          return data;
        } catch (error) {
          console.error(error);
          if ((await onError?.(error)) === true) return;
          toast({
            title: "Error: " + errorTitle,
            description: (
              <>
                {errorMessage && <>{errorMessage} </>}
                {error.message && (
                  <>
                    {errorMessage && (
                      <>
                        <br /> <br />
                      </>
                    )}
                    The following error message has been provided:
                    <br />
                    {error.message}
                  </>
                )}
                {!errorMessage &&
                  !error.message &&
                  "An unknown error has occurred."}
              </>
            ),
            variant: "destructive",
            duration: Infinity,
            allowDismiss: !proceed,
            action:
              retry || proceed || customErrorAction ? (
                <div className="flex flex-row justify-between gap-2">
                  {retry && (
                    // @ts-ignore
                    // Typescript seems to think that ToastAction is infertile
                    <ToastAction
                      altText="Retry"
                      className="flex-1"
                      onClick={() => executeAction(...args)}
                    >
                      Retry
                    </ToastAction>
                  )}
                  {proceed && (
                    // @ts-ignore
                    <ToastAction
                      altText="Continue"
                      className="flex-1"
                      onClick={() => proceedRef.current?.resolve()}
                    >
                      Continue
                    </ToastAction>
                  )}
                  {customErrorAction && (
                    // @ts-ignore
                    <ToastAction
                      altText={customErrorAction.label}
                      className="flex-1"
                      onClick={() => {
                        proceedRef.current?.resolve();
                        customErrorAction.action();
                      }}
                    >
                      {customErrorAction.label}
                    </ToastAction>
                  )}
                </div>
              ) : undefined,
          });

          if (errorDelay)
            await new Promise((resolve) => setTimeout(resolve, errorDelay));

          if (proceed || customErrorAction?.requiredToProceed)
            await (proceedRef.current?.promise || createProceedPromise());
        } finally {
          proceedRef.current = null;
          await onFinish?.();
        }
      });
    },
    [
      action,
      onStart,
      onSuccess,
      onError,
      onFinish,
      toast,
      errorTitle,
      successMessage,
      errorDelay,
      retry,
      proceed,
      customErrorAction,
      createProceedPromise,
      errorMessage,
      startTransition,
    ]
  );

  return { executeAction, isPending };
};
