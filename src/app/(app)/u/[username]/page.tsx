"use client";
import React, { useState, useEffect } from 'react';
import { Form, FormField, FormItem, FormLabel, FormMessage,FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/components/ui/use-toast';
import axios, { AxiosError } from 'axios';
import Link from 'next/link';


// Define the schema for form validation
const messageSchema = z.object({
  content: z.string(),
});

//axion error response
interface ResponseData {
  message: string;
  success: boolean;
}

const Page = () => {
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null); // Allow number or null
  const { toast } = useToast();
  const [acceptingStaus,setAcceptingStatus]=useState(false)
  const [isFunded,setIsFunded]=useState(false)
  const [amountFunded, setAmountFunded]=useState<number | null>(null); 

  // Function to extract username from the URL
  function getUsernameFromCurrentUrl() {
    const regex = /\/u\/([^\/]+)/;
    const baseUrl = `${window.location.pathname}`;
    const match = baseUrl.match(regex);
    return match ? match[1] : null;
  }
  const username = getUsernameFromCurrentUrl();

  const form = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      content: '',
    },
  });

  const handlePayment = async () => {
    try {
      const res = await initializeRazorpay();
      if (!res) {
        alert("Razorpay SDK Failed to load");
        return false;
      }

      let data;
      try {
        const response = await axios.post("/api/razorpay", {
          taxAmt: selectedAmount,
        }, {
          headers: {
            'Content-Type': 'application/json',
          }
        });

        data = response.data;
      } catch (error) {
        console.error("Error fetching data: ", error);
        alert("Failed to fetch payment details. Please try again.");
        return false;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY, 
        name: "Fund Your Homie",
        currency: data.currency,
        amount: data.amount,
        order_id: data.id,
        description: "Thank you for your test donation",
        image: "https://manuarora.in/logo.png",
        handler: function (response: Response) {
       //   alert("Razorpay Response: " + response.razorpay_payment_id);
          handleDeposit(); // Call handleDeposit function here after successful payment
          submitMessage(); // Move the submitMessage call to the handler as well
        },
        prefill: {
          name: "Shreyash Godmon",
          email: "admin@indradhanu.online",
          contact: "98534525519",
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
      return true;
    } catch (error) {
      console.error("Error during payment initialization:", error);
      alert("Payment initialization failed. Please try again.");
      return false;
    }
  };

  const initializeRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };

      document.body.appendChild(script);
    });
  };

  const onSubmit = async (data: z.infer<typeof messageSchema>) => {
    setIsSubmitting(true);
    try {
      if (selectedAmount) {
        // If an amount is selected, initiate payment first
        const paymentSuccess = await handlePayment();
        if (!paymentSuccess) {
          setIsSubmitting(false);
          return;
        }
      } else {
        // If no amount is selected, just submit the message
        await submitMessage(data);
      }
    } catch (error) {
      console.error('Error during form submission:', error);
      setIsSubmitting(false);
    }
  };

  const handleDeposit = async () => {
    console.log('Handling deposit');
    try {
      const response = await axios.post('/api/deposit', { amount: selectedAmount, username: username });
     // console.log('Deposit response:', response.data); 
      if (response.data.success) {
    //    console.log('Deposit success');
        toast({
          title: `Success ${selectedAmount} INR sent to ${username}`,
          description: 'Amount deposited successfully.',
        });
      }
      return true;
    } catch (error) {
      console.error('Error during deposit:', error);
      toast({
        title: 'Deposit Failed',
        description: 'Failed to deposit amount. Please try again.',
        variant: 'destructive',
      });
    }
    return false;
  };

  const submitMessage = async (data?: z.infer<typeof messageSchema>) => {
    try {
      const messageData = {
        content: data?.content || form.getValues("content"),
        username,
        amount: selectedAmount || 0,
      };
      const response = await axios.post('/api/send-message', messageData);

      toast({
        title: `Success ${selectedAmount} INR sent to ${username}`,
        description: response.data.message,
      });
      setAmountFunded(selectedAmount)
      setIsFunded(true)
      setIsSubmitting(false);
      form.reset(); // Reset the form after successful submission
      setSelectedAmount(null); // Reset selected amount

    } catch (error) {
      console.error('Error during message sending:', error);

      const axiosError = error as AxiosError<ResponseData>;

      // Default error message
      let errorMessage = 'There was a problem with your sending message. Please try again.';

      // If the response has a message, use it instead
      if (axiosError.response?.data.message) {
        errorMessage = axiosError.response.data.message;
      }

      toast({
        title: 'Message Not Sent',
        description: errorMessage,
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };



  //fecth status

  useEffect(() => {
    const fetchAcceptMessages = async () => {
      try {
        const response = await axios.post('/api/get-accepting-message', { username });
        if (response.data && response.data.success) {
       //   console.log(response.data.acceptingMessage);
          if (response.data.acceptingMessage == true) {
            setAcceptingStatus(true)
          }
        } else {
          console.error('Error: ', response.data.message);
        }
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    };

    if (username) {
      fetchAcceptMessages();
    }
  }, [username]);

  return (
    <div className='flex flex-col h-full flex-grow'>
    <div className="flex-grow flex flex-col items-center justify-center px-0 md:px-0 bg-white  py-0 text-black">
    <div className="my-0 mx-4 md:mx-8 lg:mx-auto h-full p-6   bg-gray-200 rounded w-full max-w-6xl">     
     <h1 className="text-4xl font-bold mb-4">Fund your homie</h1>
      <div>Send Anonymous Funds with Message to @{username}</div>
      <Form  {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto mt-10 p-4 border border-gray-400 bg-white rounded-lg">
          <FormItem className="mb-4">
            <FormLabel htmlFor="input" className="block text-gray-700 mb-2">Enter something:</FormLabel>
            <h2>Fund your Homie</h2>
            <FormField
              name="content"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <Input
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                    }}
                  />
                </FormItem>
              )}
            />
            {errorMessage && <FormMessage className="text-red-500 mt-2">{errorMessage}</FormMessage>}
          </FormItem>
          <FormItem className="mb-4">
            <FormLabel>Select Payment Amount INR:</FormLabel>
            <div className="flex flex-wrap">
              {[10, 50, 100, 500, 1000, 5000, 10000].map((amount) => (
                <label key={amount} className="mr-4 mb-2">
                  <input
                    type="radio"
                    name="paymentAmount"
                    value={amount}
                    checked={selectedAmount === amount}
                    onChange={() => setSelectedAmount(amount)}
                    className="mr-2"
                  />
                  {amount}
                </label>
              ))}
            </div>
          </FormItem>
          
          {acceptingStaus ?
          <>
          <Button type="submit" className='flex justify-end ' disabled={isSubmitting || !form.getValues('content')}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait
              </>
            ) : (
              'Send Message'
            )}
          </Button>
           <FormDescription className='text-s p-0 m-2 text-green-600'>User is Accepting Funds</FormDescription>
           </>
          :
          <FormDescription className='text-s p-0 m-2 text-red-600'>User is Not Accepting Funds</FormDescription>
          }
        </form>
      </Form>
      <div className='mb-7'>
      {isFunded &&
      <h1 >Thank you For funding your homie with {amountFunded || 0} INR</h1>
      }</div>

      <div className='text-xl'>
        <h1 className='font-bold text-xxl'>Fund Your Homie.</h1>
        <p>is an online crowd funding platform. designed for simplicity to use 
          and keep donor anonymous while funding. feel free to use it your info will
          not be collected.
        </p>
        <div className='mt-7'>
        <p>For more info visit <Link className='underline' href={'/about'}>about.</Link>        </p>

        <p>To get in touch visit <Link className='underline' href={'/contact'}>contact.</Link>        </p>

        </div>
      </div>
    </div>
    </div>
    </div>

  );
};

export default Page;
